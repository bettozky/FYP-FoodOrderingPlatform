import { HttpError } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { averageOf, liveRating, reviewsOfMerchant } from "../../lib/ratings.js";
import { db } from "../../store/db.js";
import type { Merchant, Order, User } from "../../store/types.js";

const DAY = 86400000;
const MIN = 60000;

export function logAudit(admin: User, action: string, target: string, detail?: string) {
  db.audit.unshift({ id: uid("a"), at: Date.now(), admin: admin.name, action, target, detail });
  if (db.audit.length > 500) db.audit.length = 500;
}

/** Orders that were actually paid (card/FPX online, or cash order the customer committed to). */
export const isPaid = (o: Order) => !!o.paidAt;
export const methodOf = (o: Order): "card" | "fpx" | "cash" => o.paymentMethod ?? "card";
const net = (o: Order) => Math.round((o.total - o.refunded) * 100) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

export type Flag = { code: string; severity: "high" | "medium"; text: string };

/** Numbers about one shop over the last 30 days, plus warning flags for the watchlist. */
export function shopHealth(m: Merchant, now = Date.now()) {
  const orders = [...db.orders.values()].filter((o) => o.merchantId === m.id && o.createdAt >= now - 30 * DAY);
  const requests = orders.length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const noReply = orders.filter((o) => o.status === "expired" && o.cancelReason === "no_reply").length;
  const rejected = orders.filter((o) => o.status === "rejected").length;
  const answered = orders.filter((o) => o.acceptedAt);
  const avgConfirmMin = answered.length ? answered.reduce((s, o) => s + (o.acceptedAt! - o.createdAt), 0) / answered.length / MIN : null;
  const revenue = round2(orders.filter(isPaid).reduce((s, o) => s + net(o), 0));

  const reviews = reviewsOfMerchant(m.id);
  const ratings = reviews.map((r) => r.rating);
  const avgRating = averageOf(ratings);
  const recentLow = reviews.filter((r) => r.rating <= 2 && r.createdAt >= now - 14 * DAY).length;

  const flags: Flag[] = [];
  if (avgRating !== null && reviews.length >= 3 && avgRating < 3.5) {
    flags.push({ code: "low_rating", severity: avgRating < 3 ? "high" : "medium", text: `Average rating ${avgRating.toFixed(1)} from ${reviews.length} reviews` });
  }
  if (recentLow >= 3) flags.push({ code: "low_reviews_recent", severity: "medium", text: `${recentLow} reviews of 1-2 stars in the last 14 days` });
  if (requests >= 4 && noReply / requests >= 0.25) {
    const pct = Math.round((noReply / requests) * 100);
    flags.push({ code: "no_reply", severity: pct >= 40 ? "high" : "medium", text: `${pct}% of order requests got no reply (${noReply} of ${requests})` });
  }
  if (avgConfirmMin !== null && answered.length >= 3 && avgConfirmMin > 5) {
    flags.push({ code: "slow_confirm", severity: "medium", text: `Takes ${avgConfirmMin.toFixed(1)} minutes on average to confirm an order` });
  }
  const level: "good" | "watch" | "at_risk" = flags.some((f) => f.severity === "high") ? "at_risk" : flags.length ? "watch" : "good";
  return {
    requests, completed, noReply, rejected, revenue, level, flags,
    avgConfirmMin: avgConfirmMin === null ? null : Math.round(avgConfirmMin * 10) / 10,
    reviewCount: reviews.length, avgRating, shownRating: liveRating(m), recentLow,
  };
}

export function watchlist() {
  const rank = { at_risk: 0, watch: 1, good: 2 };
  return [...db.merchants.values()]
    .filter((m) => m.approval === "approved")
    .map((m) => ({ id: m.id, name: m.name, stallNo: m.stallNo, phone: m.phone, ...shopHealth(m) }))
    .filter((x) => x.level !== "good")
    .sort((a, b) => rank[a.level] - rank[b.level] || (a.avgRating ?? 5) - (b.avgRating ?? 5));
}

const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Everything the dashboard needs in one call. All values are computed from the in-memory data. */
export function overview(now = Date.now()) {
  const orders = [...db.orders.values()];
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const today = orders.filter((o) => o.createdAt >= startOfDay.getTime());
  const paid = orders.filter(isPaid);
  const last30 = orders.filter((o) => o.createdAt >= now - 30 * DAY);
  const paid30 = last30.filter(isPaid);

  // 14-day trend (oldest first)
  const daily: { date: string; orders: number; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const t = now - i * DAY;
    const key = dayKey(t);
    const dayOrders = orders.filter((o) => dayKey(o.createdAt) === key);
    daily.push({ date: key, orders: dayOrders.length, revenue: round2(dayOrders.filter(isPaid).reduce((s, o) => s + net(o), 0)) });
  }

  // busiest hours (last 30 days)
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
  for (const o of last30) hours[new Date(o.createdAt).getHours()]!.orders++;

  const byStatus: Record<string, number> = {};
  for (const o of last30) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

  const payments = (["card", "fpx", "cash"] as const).map((method) => {
    const list = paid30.filter((o) => methodOf(o) === method);
    return { method, orders: list.length, amount: round2(list.reduce((s, o) => s + net(o), 0)) };
  });

  const modeCount: Record<string, number> = { dine_in: 0, takeaway: 0, delivery: 0 };
  for (const o of paid30) for (const mode of new Set(o.items.map((i) => i.mode))) modeCount[mode] = (modeCount[mode] ?? 0) + 1;

  const merchants = [...db.merchants.values()].filter((m) => m.approval === "approved");
  const topMerchants = merchants
    .map((m) => {
      const mine = paid30.filter((o) => o.merchantId === m.id);
      return { id: m.id, name: m.name, orders: mine.length, revenue: round2(mine.reduce((s, o) => s + net(o), 0)), rating: liveRating(m) };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const dishTotals = new Map<string, { name: string; shop: string; qty: number }>();
  for (const o of last30.filter((x) => x.status === "completed" || x.status === "preparing")) {
    for (const i of o.items.filter((x) => x.status !== "cancelled" && x.status !== "out_of_stock")) {
      const cur = dishTotals.get(i.dishId) ?? { name: i.name, shop: o.merchantName, qty: 0 };
      cur.qty += i.qty;
      dishTotals.set(i.dishId, cur);
    }
  }
  const topDishes = [...dishTotals.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  const cashOwed = orders.filter((o) => o.paymentMethod === "cash" && o.paidAt && !o.cashReceivedAt && (o.status === "preparing" || o.status === "completed"));
  const allRatings = db.reviews.filter((r) => !r.hidden).map((r) => r.rating);
  const customers = [...db.users.values()].filter((u) => u.role === "customer");

  const paidTotal30 = paid30.reduce((s, o) => s + net(o), 0);
  return {
    kpis: {
      ordersToday: today.length,
      revenueToday: round2(today.filter(isPaid).reduce((s, o) => s + net(o), 0)),
      revenue30: round2(paidTotal30),
      orders30: last30.length,
      avgOrderValue: paid30.length ? round2(paidTotal30 / paid30.length) : 0,
      completionRate: last30.length ? Math.round((last30.filter((o) => o.status === "completed").length / last30.length) * 100) : 0,
      platformRating: averageOf(allRatings),
      reviewCount: allRatings.length,
      customers: customers.length,
      merchantsApproved: merchants.length,
      refunded30: round2(last30.reduce((s, o) => s + o.refunded, 0)),
    },
    alerts: {
      merchantsPending: [...db.merchants.values()].filter((m) => m.approval === "pending").length,
      atRisk: watchlist().length,
      flaggedReviews: db.reviews.filter((r) => r.flagged && !r.hidden && !r.moderatedAt).length,
      cashOutstanding: round2(cashOwed.reduce((s, o) => s + (o.cashDue ?? o.total), 0)),
      cashOutstandingOrders: cashOwed.length,
      ordersWaiting: orders.filter((o) => o.status === "awaiting_merchant" || o.status === "awaiting_payment").length,
    },
    daily, hours, byStatus, payments, modes: modeCount, topMerchants, topDishes,
  };
}

/** Refund an order from the admin side (disputes, FR-6). Online payments go back to the payment, cash orders owe less at the stall. */
export function adminRefundCheck(o: Order, amount: number) {
  if (!o.paidAt) throw new HttpError(409, "This order was never paid, so there is nothing to refund");
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Enter an amount above 0");
  if (o.paymentMethod === "cash" && o.cashReceivedAt) throw new HttpError(409, "The cash was already collected at the stall. Settle this with the shop in person.");
  const left = round2((o.paymentMethod === "cash" ? o.cashDue ?? 0 : o.total - o.refunded));
  if (amount > left + 0.001) throw new HttpError(400, `The most you can refund is RM ${left.toFixed(2)}`);
}
