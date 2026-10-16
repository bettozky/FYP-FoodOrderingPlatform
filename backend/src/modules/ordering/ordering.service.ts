import { env } from "../../config/env.js";
import { HttpError, money } from "../../lib/http.js";
import { nextOrderId, uid } from "../../lib/ids.js";
import { isWithinHours } from "../../lib/time.js";
import { db } from "../../store/db.js";
import type { FulfilmentMode, Order, OrderItem } from "../../store/types.js";
import { startDelivery } from "../delivery/delivery.service.js";
import { notify, notifyMerchant } from "../notifications/notifications.service.js";
import { charge, refund } from "../payment/payment.service.js";

const MODES: FulfilmentMode[] = ["delivery", "dine_in", "takeaway"];
const DONE = ["collected", "delivered", "out_of_stock", "cancelled"];

export interface NewOrderInput {
  customerId: string;
  merchantId: string;
  items: { dishId: string; mode: FulfilmentMode; qty: number; options?: string[] }[];
  address?: { label: string; line: string; lat: number; lng: number };
  voucherId?: string;
  card: unknown;
}

export function placeOrder(inp: NewOrderInput): Order {
  const customer = db.users.get(inp.customerId)!;
  const m = db.merchants.get(inp.merchantId);
  if (!m || m.approval !== "approved") throw new HttpError(404, "Restaurant not found");
  if (m.storeMode === "offline" || !isWithinHours(m.hours)) throw new HttpError(409, `${m.name} is closed right now`);
  if (!Array.isArray(inp.items) || !inp.items.length) throw new HttpError(400, "Your cart is empty");
  if (inp.items.length > 40) throw new HttpError(400, "Too many items");

  const items: OrderItem[] = [];
  for (const line of inp.items) {
    const dish = db.dishes.get(String(line.dishId));
    if (!dish || dish.merchantId !== m.id) throw new HttpError(400, "An item in your cart is not sold by this restaurant");
    if (dish.soldOut) throw new HttpError(409, `${dish.name} is sold out`);
    if (!MODES.includes(line.mode)) throw new HttpError(400, "Choose dine-in, takeaway or delivery for every item");
    if (m.storeMode === "dine_in" && line.mode !== "dine_in") throw new HttpError(409, `${m.name} is dine-in only right now`);
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new HttpError(400, "Quantity must be 1-20");
    const options = (line.options ?? []).filter((o) => dish.customisations.includes(o));
    items.push({ id: uid("i"), dishId: dish.id, name: dish.name, price: dish.price, qty, mode: line.mode, options, status: "preparing" });
  }

  const hasDelivery = items.some((i) => i.mode === "delivery");
  if (hasDelivery) {
    const a = inp.address;
    if (!a || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !a.line) throw new HttpError(400, "Choose a delivery address");
  }
  const subtotal = money(items.reduce((s, i) => s + i.price * i.qty, 0));
  const deliveryFee = hasDelivery ? env.deliveryFee : 0; // one fee for the whole mixed order (FR-2.3)

  let discount = 0;
  if (inp.voucherId) {
    const v = db.vouchers.find((x) => x.id === inp.voucherId);
    if (!v || (v.merchantId && v.merchantId !== m.id)) throw new HttpError(400, "That voucher is not valid here");
    if (subtotal < v.minSpend) throw new HttpError(400, `Voucher needs a minimum spend of RM${v.minSpend.toFixed(2)}`);
    if (v.requireCategory && !items.some((i) => db.dishes.get(i.dishId)?.category === v.requireCategory))
      throw new HttpError(400, `Voucher needs a ${v.requireCategory} dish in your order`);
    if (!v.active || (v.expiryDate && v.expiryDate < new Date().toISOString().slice(0, 10)) || (v.totalLimit !== undefined && v.claimed >= v.totalLimit))
      throw new HttpError(400, "That voucher is no longer available");
    discount = money(Math.min(v.kind === "percent" ? (subtotal * v.amount) / 100 : v.amount, subtotal));
  }
  const total = money(subtotal + deliveryFee - discount);

  const id = nextOrderId();
  const payment = charge(total, inp.card, id); // one payment for every mode (FR-2.4)
  const now = Date.now();
  const order: Order = {
    id, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
    merchantId: m.id, merchantName: m.name, items, deliveryAddress: hasDelivery ? inp.address : undefined,
    subtotal, deliveryFee, discount, total, refunded: 0, paymentId: payment.id, voucherId: inp.voucherId,
    status: "awaiting_merchant", respondBy: now + env.orderResponseMs, createdAt: now, reviewedDishIds: [],
  };
  db.orders.set(id, order);
  if (inp.voucherId) {
    const v = db.vouchers.find((x) => x.id === inp.voucherId);
    if (v) { v.claimed += 1; v.costSpent = money(v.costSpent + discount); }
  }
  notifyMerchant(m.id, "new_order", "New order", `${customer.name} - RM${total.toFixed(2)}`, { orderId: id });
  return order;
}

function refundOrder(o: Order, amount: number, reason: string) {
  o.refunded = money(o.refunded + refund(o.paymentId, amount, reason));
}

export function merchantRespond(o: Order, accept: boolean) {
  if (o.status !== "awaiting_merchant") throw new HttpError(409, "This order was already answered");
  if (Date.now() > o.respondBy) throw new HttpError(409, "The 10-minute window has passed. The order was cancelled and refunded.");
  if (accept) {
    o.status = "preparing";
    o.acceptedAt = Date.now();
    for (const i of o.items) {
      const d = db.dishes.get(i.dishId);
      if (d && d.stock !== undefined) {
        d.stock = Math.max(0, d.stock - i.qty); // stock only moves once the restaurant accepts
        if (d.stock === 0) d.soldOut = true;
      }
    }
    notify(o.customerId, "order_accepted", "Order accepted", `${o.merchantName} is preparing your food.`, { orderId: o.id });
  } else {
    o.status = "rejected";
    o.items.forEach((i) => (i.status = "cancelled"));
    refundOrder(o, o.total, "Rejected by restaurant");
    notify(o.customerId, "order_rejected", "Order rejected", `${o.merchantName} could not take your order. You were refunded RM${o.total.toFixed(2)}.`, { orderId: o.id });
  }
}

export function expireOrder(o: Order) {
  o.status = "expired";
  o.items.forEach((i) => (i.status = "cancelled"));
  refundOrder(o, o.total, "Restaurant did not respond in time");
  notify(o.customerId, "order_expired", "Order cancelled", `${o.merchantName} did not reply in time. You were refunded RM${o.total.toFixed(2)}.`, { orderId: o.id });
  notifyMerchant(o.merchantId, "order_missed", "Order missed", `Order ${o.id} expired with no reply and was refunded.`, { orderId: o.id });
}

export function markOutOfStock(o: Order, itemId: string) {
  if (o.status !== "preparing") throw new HttpError(409, "Accept the order before marking items out of stock");
  const item = o.items.find((i) => i.id === itemId);
  if (!item) throw new HttpError(404, "Item not found");
  if (item.status !== "preparing") throw new HttpError(409, "That item is already " + item.status.replace("_", " "));
  item.status = "out_of_stock";
  const dish = db.dishes.get(item.dishId);
  if (dish) dish.soldOut = true; // FR-5.6: also hide it from the menu
  o.decision = "pending";
  notify(o.customerId, "out_of_stock", "Item out of stock", `${item.name} is out of stock at ${o.merchantName}. Continue without it or cancel for a full refund?`, { orderId: o.id, itemId });
}

/** Out-of-stock items + delivery fee if nothing is left to deliver. */
function refundTarget(o: Order): number {
  const oos = o.items.filter((i) => i.status === "out_of_stock" || i.status === "cancelled");
  let t = oos.reduce((s, i) => s + i.price * i.qty, 0);
  const anyDeliveryLeft = o.items.some((i) => i.mode === "delivery" && !oos.includes(i));
  if (o.deliveryFee && !anyDeliveryLeft) t += o.deliveryFee;
  return t;
}

export function customerDecision(o: Order, choice: "continue" | "cancel") {
  if (o.decision !== "pending") throw new HttpError(409, "There is nothing to decide on this order");
  if (choice === "cancel") {
    const received = o.items.filter((i) => ["collected", "delivered", "handed_over"].includes(i.status));
    o.items.forEach((i) => { if (!received.includes(i) && i.status !== "out_of_stock") i.status = "cancelled"; });
    o.status = "cancelled";
    o.decision = "cancelled";
    const keep = received.reduce((s, i) => s + i.price * i.qty, 0);
    refundOrder(o, Math.max(o.total - o.refunded - keep, 0), "Customer cancelled after out-of-stock");
    notifyMerchant(o.merchantId, "order_cancelled", "Order cancelled", `${o.customerName} cancelled order ${o.id}.`, { orderId: o.id });
    return;
  }
  o.decision = "accepted_partial";
  refundOrder(o, Math.min(refundTarget(o) - o.refunded, o.total - o.refunded), "Out-of-stock items");
  if (o.items.every((i) => i.status === "out_of_stock")) o.status = "cancelled";
  notifyMerchant(o.merchantId, "partial_ok", "Customer accepted partial order", `Order ${o.id} continues without the out-of-stock item(s).`, { orderId: o.id });
  checkComplete(o);
}

export function markReady(o: Order, mode: "dine_in" | "takeaway") {
  if (o.status !== "preparing") throw new HttpError(409, "Order is not being prepared");
  if (o.decision === "pending") throw new HttpError(409, "Wait for the customer to decide about the out-of-stock item first");
  const items = o.items.filter((i) => i.mode === mode && i.status === "preparing");
  if (!items.length) throw new HttpError(409, `No ${mode.replace("_", "-")} items waiting`);
  items.forEach((i) => (i.status = "ready"));
  const label = mode === "dine_in" ? "dine-in" : "takeaway";
  notify(o.customerId, "food_ready", "Your food is ready!", `Your ${label} food from ${o.merchantName} is ready - please collect.`, { orderId: o.id, mode, persistent: true });
}

export function confirmCollected(o: Order, mode: "dine_in" | "takeaway") {
  const items = o.items.filter((i) => i.mode === mode && i.status === "ready");
  if (!items.length) throw new HttpError(409, "Nothing to collect");
  items.forEach((i) => (i.status = "collected"));
  for (const n of db.notifications.values())
    if (n.userId === o.customerId && n.type === "food_ready" && n.data?.orderId === o.id && n.data?.mode === mode) n.ackedAt = Date.now();
  checkComplete(o);
}

export function handOver(o: Order) {
  if (o.status !== "preparing") throw new HttpError(409, "Order is not being prepared");
  if (o.decision === "pending") throw new HttpError(409, "Wait for the customer to decide about the out-of-stock item first");
  const items = o.items.filter((i) => i.mode === "delivery" && i.status === "preparing");
  if (!items.length) throw new HttpError(409, "No delivery items waiting");
  items.forEach((i) => (i.status = "handed_over"));
  startDelivery(o);
  notify(o.customerId, "handed_over", "Rider on the way", `Your delivery items from ${o.merchantName} were handed to the rider.`, { orderId: o.id });
}

export function checkComplete(o: Order) {
  if (o.status !== "preparing" || o.decision === "pending") return;
  if (o.items.every((i) => DONE.includes(i.status))) {
    o.status = "completed";
    o.completedAt = Date.now();
    notify(o.customerId, "order_completed", "Order complete", `Order ${o.id} is complete. How was the food? Rate your items.`, { orderId: o.id });
  }
}

export function reviewItem(o: Order, dishId: string, rating: number, comment: string | undefined, userName: string) {
  const item = o.items.find((i) => i.dishId === dishId && (i.status === "collected" || i.status === "delivered"));
  if (!item) throw new HttpError(409, "You can review an item after you have received it");
  if (o.reviewedDishIds.includes(dishId)) throw new HttpError(409, "You already reviewed this item");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Rating must be 1-5");
  o.reviewedDishIds.push(dishId);
  db.reviews.push({ id: uid("r"), orderId: o.id, dishId, userId: o.customerId, userName, rating, comment: comment?.slice(0, 300), createdAt: Date.now() });
}
