import type { Order } from "../../shared/api/types";

// Loyalty points from the customer's REAL orders (replaces the fixed 320 pts placeholder).
// Rule: 1 point for every full RM 1 paid on a completed order, minus anything refunded.
// When Michael's loyalty_ledger endpoint is ready, read the balance from it here instead;
// the screens only use this hook, so nothing else changes. Tier names and limits: agree in the group chat.
export const TIERS = [
  { name: "Regular", min: 0 },
  { name: "Silver", min: 200 },
  { name: "Gold", min: 500 },
] as const;

export function pointsFromOrders(orders: Pick<Order, "status" | "total" | "refunded">[]): number {
  return orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Math.max(0, Math.floor(o.total - (o.refunded || 0))), 0);
}

export function loyaltyFor(points: number) {
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1].min) i++;
  const next = TIERS[i + 1];
  return {
    points,
    tier: TIERS[i].name,
    nextTier: next?.name ?? null,
    toNext: next ? next.min - points : 0,
    // Share of the way from this tier to the next (1 at the top tier).
    progress: next ? (points - TIERS[i].min) / (next.min - TIERS[i].min) : 1,
  };
}
