import { Router } from "express";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";

/**
 * Loyalty points, worked out from the customer's real orders (nothing extra to store):
 * 1 point for every full RM 1 paid on a completed order, minus anything refunded.
 * These are the same rules as apps/customer-app/src/modules/loyalty/points.ts, so the app can switch to this endpoint
 * without the numbers changing. Change the tiers or the rule here (and in the app) once the group agrees on them.
 */
export const TIERS = [
  { name: "Regular", min: 0 },
  { name: "Silver", min: 200 },
  { name: "Gold", min: 500 },
] as const;

export const loyaltyRouter = Router();
loyaltyRouter.use(auth("customer"));

loyaltyRouter.get("/", (_req, res) => {
  const u = currentUser(res);
  const history = [...db.orders.values()]
    .filter((o) => o.customerId === u.id && o.status === "completed")
    .map((o) => ({ orderId: o.id, merchantName: o.merchantName, at: o.completedAt ?? o.createdAt, points: Math.max(0, Math.floor(o.total - (o.refunded || 0))) }))
    .sort((a, b) => b.at - a.at);
  const points = history.reduce((s, h) => s + h.points, 0);
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1]!.min) i++;
  const next = TIERS[i + 1];
  res.json({
    points, tier: TIERS[i]!.name, nextTier: next?.name ?? null, toNext: next ? next.min - points : 0,
    progress: next ? (points - TIERS[i]!.min) / (next.min - TIERS[i]!.min) : 1,
    tiers: TIERS, history,
  });
});
