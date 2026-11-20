// Feature 2 "Ready when you arrive": the customer taps "I'm 5 min away" on a dine-in or takeaway order,
// the stall is told when they will turn up, and can time the food so it is fresh, not waiting.
import { HttpError } from "../../lib/http.js";
import { notifyMerchant } from "../notifications/notifications.service.js";
import type { Order } from "../../store/types.js";

export const ARRIVING_MIN = 1;
export const ARRIVING_MAX = 60;

/** The order still has dine-in or takeaway food the customer will collect. */
export function canSayArriving(o: Pick<Order, "status" | "items">): boolean {
  if (o.status !== "awaiting_payment" && o.status !== "preparing") return false;
  return o.items.some((i) => (i.mode === "dine_in" || i.mode === "takeaway") && (i.status === "preparing" || i.status === "ready"));
}

export function setArriving(o: Order, minutes: number, now = Date.now()): Order {
  if (!Number.isInteger(minutes) || minutes < ARRIVING_MIN || minutes > ARRIVING_MAX) throw new HttpError(400, `minutes must be a whole number from ${ARRIVING_MIN} to ${ARRIVING_MAX}`);
  if (!canSayArriving(o)) throw new HttpError(409, "This order has no food left to collect");
  o.arrivingAt = now + minutes * 60000;
  const at = new Date(o.arrivingAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
  notifyMerchant(o.merchantId, "customer_arriving", "Customer on the way", `${o.customerName} arrives in about ${minutes} min (${at}) for order ${o.id}.`, { orderId: o.id, arrivingAt: o.arrivingAt });
  return o;
}
