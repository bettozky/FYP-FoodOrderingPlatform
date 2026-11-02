import { Router } from "express";
import { HttpError, int, money, str } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { liveRating, merchantIdOfReview } from "../../lib/ratings.js";
import { signedUrl } from "../../lib/storage.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import { postAdminNotice } from "../announcements/announcements.routes.js";
import { notify, notifyMerchant } from "../notifications/notifications.service.js";
import { refundOrder } from "../ordering/ordering.service.js";
import { adminRefundCheck, isPaid, logAudit, methodOf, overview, shopHealth, watchlist } from "./admin.service.js";

// FR-6.1 / FR-6.2: admin-only merchant approval.
export const adminRouter = Router();
adminRouter.use(auth("admin"));

adminRouter.get("/merchants", (req, res) => {
  const status = String(req.query.status ?? "");
  const list = [...db.merchants.values()]
    .filter((m) => !status || m.approval === status)
    .map((m) => {
      const owner = m.ownerUserId ? db.users.get(m.ownerUserId) : undefined;
      const h = shopHealth(m);
      return {
        id: m.id, name: m.name, stallNo: m.stallNo, tags: m.tags, phone: m.phone, approval: m.approval, owner: owner?.name, email: owner?.email, hours: m.hours,
        rating: liveRating(m), reviewCount: h.reviewCount, orders30: h.requests, revenue30: h.revenue, level: h.level, flags: h.flags,
        businessType: m.application?.business?.type ?? null,
        submittedAt: m.application?.agreedTermsAt ?? null, // when the merchant sent the sign-up (null for demo shops)
      };
    })
    // Newest sign-ups first; shops without an application (demo data) keep their order after them.
    .sort((a, b) => String(b.submittedAt ?? "").localeCompare(String(a.submittedAt ?? "")));
  res.json({ merchants: list });
});

// FR-6.2: everything the merchant sent in the sign-up wizard, so the admin can review it before approving.
// Uploaded photos keep their public URL; private certificates get a link that works for one hour.
adminRouter.get("/merchants/:id", async (req, res) => {
  const m = db.merchants.get(req.params.id as string);
  if (!m) throw new HttpError(404, "Merchant not found");
  const owner = m.ownerUserId ? db.users.get(m.ownerUserId) : undefined;
  const dishes = [...db.dishes.values()].filter((d) => d.merchantId === m.id).map((d) => ({ id: d.id, name: d.name, price: d.price, description: d.description, image: d.image }));
  const application = m.application ? structuredClone(m.application) : null;
  for (const f of Object.values<any>(application?.files ?? {})) {
    if (f?.bucket && f?.path && !f.url) f.url = await signedUrl(f.bucket, f.path);
  }
  res.json({
    merchant: {
      id: m.id, name: m.name, stallNo: m.stallNo, tags: m.tags, phone: m.phone, approval: m.approval, owner: owner?.name, email: owner?.email,
      hours: m.hours, weeklyHours: m.weeklyHours ?? null, prepMinutes: m.prepMinutes, storeMode: m.storeMode, lat: m.lat, lng: m.lng,
      businessType: m.application?.business?.type ?? null, submittedAt: m.application?.agreedTermsAt ?? null, application, dishes,
    },
  });
});

adminRouter.patch("/merchants/:id", (req, res) => {
  const m = db.merchants.get(req.params.id as string);
  if (!m) throw new HttpError(404, "Merchant not found");
  const approval = req.body?.approval;
  if (!["approved", "rejected", "suspended", "pending"].includes(approval)) throw new HttpError(400, "approval must be approved, rejected, suspended or pending");
  m.approval = approval;
  logAudit(currentUser(res), `merchant_${approval}`, m.name);
  notifyMerchant(m.id, "approval", `Business ${approval}`, approval === "approved" ? "Your business is live on ScootMeal." : `Your business was ${approval} by the admin.`);
  res.json({ merchant: { id: m.id, approval: m.approval } });
});

// FR-6.4: every order, newest first, for the admin orders list.
adminRouter.get("/orders", (req, res) => {
  const status = String(req.query.status ?? "");
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const merchantId = String(req.query.merchantId ?? "");
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const orders = [...db.orders.values()]
    .filter((o) => !status || o.status === status)
    .filter((o) => !merchantId || o.merchantId === merchantId)
    .filter((o) => !q || `${o.id} ${o.customerName} ${o.merchantName}`.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map((o) => ({
      id: o.id, customerName: o.customerName, merchantName: o.merchantName, status: o.status,
      itemCount: o.items.reduce((n, i) => n + i.qty, 0), total: o.total, refunded: o.refunded,
      createdAt: o.createdAt, paidAt: o.paidAt ?? null, cancelReason: o.cancelReason ?? null,
      merchantId: o.merchantId, method: o.paidAt ? (o.paymentMethod ?? "card") : null, cashPending: o.paymentMethod === "cash" && !!o.paidAt && !o.cashReceivedAt,
    }));
  res.json({ orders });
});

// FR-6.6: numbers for the dashboard (computed from real data, not placeholders).
adminRouter.get("/stats", (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = [...db.orders.values()].filter((o) => o.createdAt >= startOfDay.getTime());
  const paidToday = today.filter((o) => o.paidAt);
  const merchants = [...db.merchants.values()];
  res.json({
    ordersToday: today.length,
    revenueToday: Math.round(paidToday.reduce((s, o) => s + o.total - o.refunded, 0) * 100) / 100,
    merchantsPending: merchants.filter((m) => m.approval === "pending").length,
    merchantsApproved: merchants.filter((m) => m.approval === "approved").length,
    ordersWaiting: [...db.orders.values()].filter((o) => o.status === "awaiting_merchant" || o.status === "awaiting_payment").length,
  });
});

// ---- Watchlist: shops with low ratings, missed orders or slow confirmations ----
adminRouter.get("/watchlist", (_req, res) => {
  res.json({ merchants: watchlist() });
});

adminRouter.post("/merchants/:id/warn", (req, res) => {
  const m = db.merchants.get(req.params.id as string);
  if (!m) throw new HttpError(404, "Merchant not found");
  const message = str(req.body?.message, "Message", { max: 300 });
  notifyMerchant(m.id, "admin_warning", "Message from ScootMeal admin", message);
  logAudit(currentUser(res), "merchant_warned", m.name, message);
  res.json({ ok: true });
});

// ---- Overview for the dashboard ----
adminRouter.get("/overview", (_req, res) => {
  res.json(overview());
});

// ---- Review moderation ----
function reviewRow(r: (typeof db.reviews)[number]) {
  const mid = merchantIdOfReview(r);
  const m = mid ? db.merchants.get(mid) : undefined;
  return {
    id: r.id, orderId: r.orderId, merchantId: mid ?? null, merchantName: m?.name ?? "Unknown shop", dishName: db.dishes.get(r.dishId)?.name ?? "Unknown dish",
    userName: r.userName, rating: r.rating, comment: r.comment ?? "", createdAt: r.createdAt,
    flagged: !!r.flagged, flagReason: r.flagReason ?? null, hidden: !!r.hidden, adminNote: r.adminNote ?? "", moderated: !!r.moderatedAt,
  };
}
const inQueue = (r: (typeof db.reviews)[number]) => !!r.flagged && !r.hidden && !r.moderatedAt;

adminRouter.get("/reviews", (req, res) => {
  const filter = String(req.query.filter ?? "all");
  const merchantId = String(req.query.merchantId ?? "");
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const all = [...db.reviews];
  const counts = {
    all: all.length,
    queue: all.filter(inQueue).length,
    low: all.filter((r) => r.rating <= 2 && !r.hidden).length,
    hidden: all.filter((r) => r.hidden).length,
  };
  const rows = all
    .filter((r) => (filter === "queue" ? inQueue(r) : filter === "low" ? r.rating <= 2 && !r.hidden : filter === "hidden" ? r.hidden : true))
    .filter((r) => !merchantId || merchantIdOfReview(r) === merchantId)
    .map(reviewRow)
    .filter((r) => !q || `${r.comment} ${r.userName} ${r.merchantName} ${r.dishName}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.flagged && !b.hidden && !b.moderated) - Number(a.flagged && !a.hidden && !a.moderated) || b.createdAt - a.createdAt)
    .slice(0, 300);
  res.json({ counts, reviews: rows });
});

adminRouter.patch("/reviews/:id", (req, res) => {
  const r = db.reviews.find((x) => x.id === req.params.id);
  if (!r) throw new HttpError(404, "Review not found");
  const b = req.body ?? {};
  const admin = currentUser(res);
  const row = () => `${r.userName} on ${db.dishes.get(r.dishId)?.name ?? "a dish"}`;
  if (typeof b.hidden === "boolean" && b.hidden !== !!r.hidden) {
    r.hidden = b.hidden;
    logAudit(admin, b.hidden ? "review_hidden" : "review_restored", row(), r.comment?.slice(0, 80));
  }
  if (typeof b.flagged === "boolean" && b.flagged !== !!r.flagged) {
    r.flagged = b.flagged;
    if (b.flagged) r.flagReason = r.flagReason ?? "Flagged by admin";
    logAudit(admin, b.flagged ? "review_flagged" : "review_flag_dismissed", row());
  }
  if (b.note !== undefined) r.adminNote = str(b.note, "Note", { max: 200, optional: true });
  r.moderatedAt = Date.now();
  res.json({ review: reviewRow(r) });
});

// ---- Orders: search, detail, refunds ----
adminRouter.get("/orders/:id", (req, res) => {
  const o = db.orders.get(req.params.id as string);
  if (!o) throw new HttpError(404, "Order not found");
  const pay = o.paymentId ? db.payments.get(o.paymentId) : undefined;
  const merchant = db.merchants.get(o.merchantId);
  const timeline = [
    { label: "Request sent", at: o.createdAt },
    ...(o.acceptedAt ? [{ label: "Shop confirmed", at: o.acceptedAt }] : []),
    ...(o.paidAt ? [{ label: o.paymentMethod === "cash" ? "Customer chose cash at the stall" : `Paid by ${methodOf(o) === "fpx" ? "FPX" : "card"}`, at: o.paidAt }] : []),
    ...(o.cashReceivedAt ? [{ label: "Shop received the cash", at: o.cashReceivedAt }] : []),
    ...(o.completedAt ? [{ label: "Completed", at: o.completedAt }] : []),
    ...(pay?.refunds ?? []).map((r) => ({ label: `Refund RM ${r.amount.toFixed(2)}: ${r.reason}`, at: r.at })),
    ...(["rejected", "expired", "cancelled"].includes(o.status) ? [{ label: o.status === "rejected" ? "Declined by shop" : o.status === "expired" ? (o.cancelReason === "not_paid" ? "Not paid in time" : "Shop did not reply") : "Cancelled", at: o.completedAt ?? o.payBy ?? o.respondBy }] : []),
  ].sort((a, b) => a.at - b.at);
  res.json({
    order: { ...o, merchantPhone: merchant?.phone, method: o.paidAt ? methodOf(o) : null, canRefund: isPaid(o) && !(o.paymentMethod === "cash" && o.cashReceivedAt) && (o.paymentMethod === "cash" ? (o.cashDue ?? 0) > 0 : o.total - o.refunded > 0) },
    timeline,
  });
});

adminRouter.post("/orders/:id/refund", (req, res) => {
  const o = db.orders.get(req.params.id as string);
  if (!o) throw new HttpError(404, "Order not found");
  const amount = money(Number(req.body?.amount));
  const reason = str(req.body?.reason, "Reason", { max: 120 });
  adminRefundCheck(o, amount);
  const before = o.refunded;
  refundOrder(o, amount, `Admin: ${reason}`);
  const done = money(o.refunded - before);
  if (done <= 0) throw new HttpError(409, "Nothing could be refunded on this order");
  notify(o.customerId, "refund", "Refund issued", `ScootMeal refunded RM ${done.toFixed(2)} on order ${o.id}. Reason: ${reason}.`, { orderId: o.id });
  logAudit(currentUser(res), "order_refunded", `${o.id} (${o.merchantName})`, `RM ${done.toFixed(2)}: ${reason}`);
  res.json({ ok: true, refunded: done, order: { id: o.id, refunded: o.refunded } });
});

// ---- Customers and shop owners ----
adminRouter.get("/users", (req, res) => {
  const role = String(req.query.role ?? "customer");
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const orders = [...db.orders.values()];
  const rows = [...db.users.values()]
    .filter((u) => u.role !== "admin" && (!role || u.role === role))
    .filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q))
    .map((u) => {
      const mine = orders.filter((o) => o.customerId === u.id);
      return {
        id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, role: u.role, suspended: !!u.suspended,
        shop: u.merchantId ? db.merchants.get(u.merchantId)?.name ?? null : null,
        orders: mine.length, cancelled: mine.filter((o) => o.status === "cancelled" || o.status === "expired").length,
        spent: money(mine.filter(isPaid).reduce((s, o) => s + o.total - o.refunded, 0)),
        reviews: db.reviews.filter((r) => r.userId === u.id).length,
        flaggedReviews: db.reviews.filter((r) => r.userId === u.id && (r.flagged || r.hidden)).length,
      };
    })
    .sort((a, b) => b.spent - a.spent);
  res.json({ users: rows });
});

adminRouter.patch("/users/:id", (req, res) => {
  const u = db.users.get(req.params.id as string);
  if (!u) throw new HttpError(404, "User not found");
  const admin = currentUser(res);
  if (u.role === "admin") throw new HttpError(403, "Admin accounts cannot be suspended here");
  if (typeof req.body?.suspended !== "boolean") throw new HttpError(400, "suspended must be true or false");
  u.suspended = req.body.suspended;
  if (u.suspended) for (const [t, id] of db.tokens) if (id === u.id) { db.tokens.delete(t); db.tokenExpiry.delete(t); } // log them out straight away
  logAudit(admin, u.suspended ? "user_suspended" : "user_restored", `${u.name} (${u.role})`);
  res.json({ user: { id: u.id, suspended: u.suspended } });
});

// ---- Reservations (read-only overview) ----
adminRouter.get("/reservations", (req, res) => {
  const status = String(req.query.status ?? "");
  const rows = [...db.reservations.values()]
    .filter((r) => !status || r.status === status)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 300)
    .map((r) => ({
      id: r.id, customerName: r.customerName, merchantName: r.merchantName, date: r.date, time: r.time, partySize: r.partySize,
      status: r.status, table: r.allocatedTable ?? null, payNow: r.payNow, paid: r.paid, refunded: r.refunded, createdAt: r.createdAt,
    }));
  res.json({ reservations: rows });
});

// ---- Vouchers: oversee every promotion, and create platform-wide ones ----
const voucherRow = (v: (typeof db.vouchers)[number]) => ({ ...v, scope: v.merchantId ? db.merchants.get(v.merchantId)?.name ?? "Shop" : "Platform-wide" });
adminRouter.get("/vouchers", (_req, res) => {
  res.json({ vouchers: db.vouchers.map(voucherRow) });
});
adminRouter.patch("/vouchers/:id", (req, res) => {
  const v = db.vouchers.find((x) => x.id === req.params.id);
  if (!v) throw new HttpError(404, "Voucher not found");
  if (typeof req.body?.active !== "boolean") throw new HttpError(400, "active must be true or false");
  v.active = req.body.active;
  logAudit(currentUser(res), v.active ? "voucher_enabled" : "voucher_disabled", v.title);
  res.json({ voucher: voucherRow(v) });
});
adminRouter.post("/vouchers", (req, res) => {
  const b = req.body ?? {};
  const amount = Number(b.amount), minSpend = Number(b.minSpend ?? 0);
  const kind = b.kind === "percent" ? "percent" : "fixed";
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Discount must be above 0");
  if (kind === "percent" && amount > 100) throw new HttpError(400, "A percentage discount cannot be above 100");
  if (!Number.isFinite(minSpend) || minSpend < 0) throw new HttpError(400, "Minimum spend cannot be negative");
  const title = str(b.title, "Voucher code", { max: 30 }).toUpperCase();
  if (db.vouchers.some((v) => v.title === title)) throw new HttpError(409, "A voucher with that code already exists");
  const v = {
    id: uid("v"), title,
    description: str(b.description, "Description", { max: 120, optional: true }) || `${kind === "percent" ? `${amount}% off` : `RM${amount} off`}, min spend RM${minSpend}`,
    amount: money(amount), kind: kind as "fixed" | "percent", minSpend: money(minSpend),
    totalLimit: b.totalLimit === undefined || b.totalLimit === "" ? undefined : int(b.totalLimit, "Total limit", 1, 100000),
    claimed: 0, costSpent: 0, expiryDate: b.expiryDate ? str(b.expiryDate, "Expiry date", { max: 10 }) : undefined, active: true,
  };
  db.vouchers.push(v);
  logAudit(currentUser(res), "voucher_created", v.title, v.description);
  res.status(201).json({ voucher: voucherRow(v) });
});

// ---- Announcements to customers and/or shops ----
adminRouter.post("/announcements", (req, res) => {
  const audience = String(req.body?.audience ?? "");
  if (!["customers", "merchants", "all"].includes(audience)) throw new HttpError(400, "Choose who should get this: customers, merchants or all");
  const title = str(req.body?.title, "Title", { max: 80 });
  const body = str(req.body?.body, "Message", { max: 400 });
  const targets = [...db.users.values()].filter((u) => !u.suspended && (audience === "all" ? u.role !== "admin" : u.role === (audience === "customers" ? "customer" : "merchant")));
  for (const u of targets) notify(u.id, "announcement", title, body);
  // Customers can also read it later on the Announcements page (optional: pinned, expiresInDays).
  if (audience !== "merchants") postAdminNotice(title, body, { pinned: Boolean(req.body?.pinned), expiresInDays: req.body?.expiresInDays ? int(req.body.expiresInDays, "Days", 1, 90) : undefined });
  logAudit(currentUser(res), "announcement", `${audience} (${targets.length})`, `${title}\n${body}`.slice(0, 300));
  res.status(201).json({ sent: targets.length });
});

// ---- Activity log ----
adminRouter.get("/audit", (req, res) => {
  const action = String(req.query.action ?? "");
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  res.json({ entries: db.audit.filter((a) => !action || a.action === action || a.action.startsWith(action)).slice(0, limit) });
});
