import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { auth } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import { notifyMerchant } from "../notifications/notifications.service.js";

// FR-6.1 / FR-6.2: admin-only merchant approval.
export const adminRouter = Router();
adminRouter.use(auth("admin"));

adminRouter.get("/merchants", (req, res) => {
  const status = String(req.query.status ?? "");
  const list = [...db.merchants.values()]
    .filter((m) => !status || m.approval === status)
    .map((m) => {
      const owner = m.ownerUserId ? db.users.get(m.ownerUserId) : undefined;
      return { id: m.id, name: m.name, stallNo: m.stallNo, tags: m.tags, phone: m.phone, approval: m.approval, owner: owner?.name, email: owner?.email, hours: m.hours };
    });
  res.json({ merchants: list });
});

adminRouter.patch("/merchants/:id", (req, res) => {
  const m = db.merchants.get(req.params.id as string);
  if (!m) throw new HttpError(404, "Merchant not found");
  const approval = req.body?.approval;
  if (!["approved", "rejected", "suspended", "pending"].includes(approval)) throw new HttpError(400, "approval must be approved, rejected, suspended or pending");
  m.approval = approval;
  notifyMerchant(m.id, "approval", `Business ${approval}`, approval === "approved" ? "Your business is live on ScootMeal." : `Your business was ${approval} by the admin.`);
  res.json({ merchant: { id: m.id, approval: m.approval } });
});

// FR-6.4: every order, newest first, for the admin orders list.
adminRouter.get("/orders", (req, res) => {
  const status = String(req.query.status ?? "");
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const orders = [...db.orders.values()]
    .filter((o) => !status || o.status === status)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map((o) => ({
      id: o.id, customerName: o.customerName, merchantName: o.merchantName, status: o.status,
      itemCount: o.items.reduce((n, i) => n + i.qty, 0), total: o.total, refunded: o.refunded,
      createdAt: o.createdAt, paidAt: o.paidAt ?? null, cancelReason: o.cancelReason ?? null,
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
