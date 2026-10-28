import { serverTime } from "../../shared/api/client";
import { Order } from "../../shared/api/types";
import { useLive } from "./LiveDataContext";

export type PayMethod = "card" | "fpx" | "cash";
export const METHOD_LABEL: Record<PayMethod, string> = { card: "Card", fpx: "FPX online banking", cash: "Cash at the stall" };

/** Orders the stall has confirmed that are still waiting for the customer to pay, soonest deadline first. */
export function usePayableOrders(): Order[] {
  const { orders } = useLive();
  const now = serverTime();
  return orders
    .filter((o) => o.status === "awaiting_payment" && (o.payBy ?? 0) > now)
    .sort((a, b) => (a.payBy ?? 0) - (b.payBy ?? 0));
}
