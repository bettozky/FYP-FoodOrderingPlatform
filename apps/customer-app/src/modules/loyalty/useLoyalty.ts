import { useMemo } from "react";
import { useLive } from "../ordering/LiveDataContext";
import { loyaltyFor, pointsFromOrders } from "./points";

export { TIERS, loyaltyFor, pointsFromOrders } from "./points";

/** Loyalty balance and tier for the signed-in customer, from their real orders (see points.ts). */
export function useLoyalty() {
  const { orders } = useLive();
  return useMemo(() => loyaltyFor(pointsFromOrders(orders)), [orders]);
}
