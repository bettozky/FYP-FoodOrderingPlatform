// Server-side timers (NFR-2). Runs every SWEEP_MS so countdowns survive apps being closed.
import { env } from "../config/env.js";
import { slotEpoch } from "../lib/time.js";
import { db } from "../store/db.js";
import { isDelivered } from "../modules/delivery/delivery.service.js";
import { notify } from "../modules/notifications/notifications.service.js";
import { checkComplete, expireOrder, expireUnpaid } from "../modules/ordering/ordering.service.js";
import { expireCalls } from "../modules/calls/calls.service.js";
import { expireReservation, expireUnpaidReservation } from "../modules/dine-in/reservations.service.js";

const DAY = 86400000;
let lastTidy = 0;
/** Once a minute: forget expired logins and dismissed notifications older than a week (keeps the data set small). */
function tidy(now: number) {
  if (now - lastTidy < 60_000) return;
  lastTidy = now;
  for (const [t, exp] of db.tokenExpiry) if (exp < now) { db.tokenExpiry.delete(t); db.tokens.delete(t); }
  for (const [id, n] of db.notifications) if (n.ackedAt && now - n.ackedAt > 7 * DAY) db.notifications.delete(id);
}

export function sweep(now = Date.now()) {
  tidy(now);
  expireCalls(now);
  for (const o of db.orders.values()) {
    if (o.status === "awaiting_merchant" && now > o.respondBy) expireOrder(o);
    if (o.status === "awaiting_payment" && o.payBy && now > o.payBy) expireUnpaid(o);
    if (o.status === "preparing") {
      if (o.items.some((i) => i.status === "handed_over") && isDelivered(o.id)) {
        o.items.forEach((i) => { if (i.status === "handed_over") i.status = "delivered"; });
        notify(o.customerId, "delivered", "Delivered", `Your delivery from ${o.merchantName} has arrived.`, { orderId: o.id });
        checkComplete(o);
      }
    }
  }
  for (const r of db.reservations.values()) {
    if (r.status === "awaiting_restaurant" && now > r.respondBy) expireReservation(r);
    if (r.status === "awaiting_payment" && r.payBy && now > r.payBy) expireUnpaidReservation(r);
    if (r.status === "confirmed") {
      const at = slotEpoch(r.date, r.time);
      if (!r.reminded && at - now <= env.reminderMs && at > now) {
        r.reminded = true;
        notify(r.customerId, "reservation_reminder", "Reservation reminder", `Your table at ${r.merchantName} is at ${r.time}.`, { reservationId: r.id });
      }
      if (now > at + 3 * 3600000) r.status = "completed";
    }
  }
}

export function startSweeper() {
  return setInterval(() => {
    try { sweep(); } catch (e) { console.error("sweep failed", e); }
  }, env.sweepMs);
}
