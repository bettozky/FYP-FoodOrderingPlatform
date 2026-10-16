// Simulated delivery provider (FR-7.x). Replace with Lalamove later behind the same functions (NFR-8).
import { env } from "../../config/env.js";
import { db, RIDERS } from "../../store/db.js";
import type { Delivery, Order } from "../../store/types.js";

export type DeliveryStatus = "assigned" | "picked_up" | "en_route" | "delivered";
const STAGES: DeliveryStatus[] = ["assigned", "picked_up", "en_route", "delivered"];
let rr = 0;

export function startDelivery(order: Order): Delivery | undefined {
  if (db.deliveries.has(order.id) || !order.deliveryAddress) return db.deliveries.get(order.id);
  const m = db.merchants.get(order.merchantId)!;
  const rider = RIDERS[rr++ % RIDERS.length]!;
  const d: Delivery = {
    orderId: order.id, riderId: rider.id, startedAt: Date.now(),
    from: { lat: m.lat, lng: m.lng }, to: { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng },
  };
  db.deliveries.set(order.id, d);
  return d;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function trackingFor(orderId: string) {
  const d = db.deliveries.get(orderId);
  if (!d) return null;
  const elapsed = Date.now() - d.startedAt;
  const idx = Math.min(Math.floor(elapsed / env.deliveryStageMs), STAGES.length - 1);
  const status = STAGES[idx]!;
  const rider0 = RIDERS.find((r) => r.id === d.riderId)!;
  // rider -> restaurant while "assigned", then restaurant -> customer.
  let pos: { lat: number; lng: number };
  const t = Math.min(elapsed / env.deliveryStageMs, STAGES.length - 1);
  if (t < 1) pos = { lat: lerp(rider0.lat, d.from.lat, t), lng: lerp(rider0.lng, d.from.lng, t) };
  else {
    const k = Math.min((t - 1) / (STAGES.length - 2), 1);
    pos = { lat: lerp(d.from.lat, d.to.lat, k), lng: lerp(d.from.lng, d.to.lng, k) };
  }
  return { status, rider: { id: rider0.id, name: rider0.name, lat: pos.lat, lng: pos.lng }, destination: d.to, restaurant: d.from };
}

export function isDelivered(orderId: string): boolean {
  return trackingFor(orderId)?.status === "delivered";
}
