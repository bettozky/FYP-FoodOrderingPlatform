// Live wait time for a stall (feature 1 "Live Canteen Map" and feature 2 "Live wait times").
// Kept free of the database so it can be tested on its own (see backend/tests/waitTime.test.ts).
//
// How it is worked out:
//   queue = orders the stall is cooking now, plus orders it has accepted that are waiting for payment
//   wait  = the stall's own prep time + queue × (half its prep time, rounded up)
// Half the prep time per order ahead because a stall usually cooks a few orders side by side.
// The busy level is what the canteen map colours the stall with:
//   quiet (green) up to 12 min · busy (amber) 13-20 min · very_busy (red) over 20 min · closed (grey).
import type { Order } from "../../store/types.js";

export type BusyLevel = "quiet" | "busy" | "very_busy" | "closed";

export const QUIET_MAX = 12;
export const BUSY_MAX = 20;
const MAX_WAIT = 90;

/** True while an order still needs cooking time at the stall. */
export function isInQueue(o: Pick<Order, "status" | "items">): boolean {
  if (o.status === "awaiting_payment") return true;
  if (o.status !== "preparing") return false;
  return o.items.some((i) => i.status === "preparing");
}

export function busyLevel(waitMinutes: number, open: boolean): BusyLevel {
  if (!open) return "closed";
  if (waitMinutes <= QUIET_MAX) return "quiet";
  if (waitMinutes <= BUSY_MAX) return "busy";
  return "very_busy";
}

export function estimateWait(prepMinutes: number, orders: Iterable<Pick<Order, "merchantId" | "status" | "items">>, merchantId: string, open: boolean) {
  let queue = 0;
  for (const o of orders) if (o.merchantId === merchantId && isInQueue(o)) queue++;
  const prep = Math.max(1, Math.round(prepMinutes));
  const waitMinutes = Math.min(MAX_WAIT, prep + queue * Math.ceil(prep / 2));
  return { queue, waitMinutes, busy: busyLevel(waitMinutes, open) };
}
