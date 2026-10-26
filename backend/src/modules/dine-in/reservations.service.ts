import { env } from "../../config/env.js";
import { HttpError, money } from "../../lib/http.js";
import { nextReservationId, uid } from "../../lib/ids.js";
import { isWithinHours, slotEpoch } from "../../lib/time.js";
import { db } from "../../store/db.js";
import type { Reservation } from "../../store/types.js";
import { notify, notifyMerchant } from "../notifications/notifications.service.js";
import { charge, refund } from "../payment/payment.service.js";

export interface NewReservation {
  customerId: string; merchantId: string; date: string; time: string; partySize: number;
  specialRequest?: string; preorder: { dishId: string; qty: number }[]; payNow: boolean;
}

export function checkSlot(merchantId: string, date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new HttpError(400, "Choose a date and time slot");
  const at = slotEpoch(date, time);
  if (Number.isNaN(at) || at < Date.now() + 15 * 60 * 1000) throw new HttpError(400, "Pick a time at least 15 minutes from now");
  if (at > Date.now() + 60 * 86400000) throw new HttpError(400, "Reservations open up to 60 days ahead");
  const m = db.merchants.get(merchantId)!;
  const h = m.hours;
  const inside = h.open <= h.close ? time >= h.open && time <= h.close : time >= h.open || time <= h.close;
  if (!inside) throw new HttpError(400, `${m.name} is open ${h.open}-${h.close}. Pick a slot in that time.`);
  void isWithinHours;
}

export function createReservation(inp: NewReservation): Reservation {
  const m = db.merchants.get(inp.merchantId);
  if (!m || m.approval !== "approved" || !m.venueCategory) throw new HttpError(404, "Venue not found");
  if (m.storeMode === "offline") throw new HttpError(409, `${m.name} is not taking bookings right now`);
  checkSlot(m.id, inp.date, inp.time);
  const party = Number(inp.partySize);
  if (!Number.isInteger(party) || party < 1 || party > 20) throw new HttpError(400, "Party size must be 1-20");
  const pre = (inp.preorder ?? []).map((l) => {
    const d = db.dishes.get(String(l.dishId));
    if (!d || d.merchantId !== m.id) throw new HttpError(400, "Pre-order item not sold here");
    if (d.soldOut) throw new HttpError(409, `${d.name} is sold out`);
    const qty = Number(l.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new HttpError(400, "Quantity must be 1-20");
    return { id: uid("p"), dishId: d.id, name: d.name, price: d.price, qty, status: "pending" as const };
  });
  const c = db.users.get(inp.customerId)!;
  const id = nextReservationId();
  // Confirm-then-pay (SB-9): nothing is charged now. A Pay Now booking is paid after the restaurant confirms.
  const now = Date.now();
  const r: Reservation = {
    id, customerId: c.id, customerName: c.name, customerPhone: c.phone ?? "", merchantId: m.id, merchantName: m.name,
    date: inp.date, time: inp.time, partySize: party, specialRequest: inp.specialRequest?.slice(0, 200) || undefined,
    preorder: pre, payNow: inp.payNow, paid: 0, refunded: 0, status: "awaiting_restaurant",
    respondBy: now + env.reservationResponseMs, createdAt: now,
  };
  db.reservations.set(id, r);
  notifyMerchant(m.id, "new_reservation", "New reservation", `${c.name}, party of ${party}, ${inp.date} ${inp.time}`, { reservationId: id });
  return r;
}

function refundAll(r: Reservation, reason: string) {
  r.refunded = money(r.refunded + refund(r.paymentId, r.paid - r.refunded, reason));
}

export function respondReservation(r: Reservation, accept: boolean, table?: string) {
  if (r.status !== "awaiting_restaurant") throw new HttpError(409, "This reservation was already answered");
  if (Date.now() > r.respondBy) throw new HttpError(409, "The 30-minute window has passed. The request expired.");
  if (accept) {
    if (!table) throw new HttpError(400, "Choose a table to allocate");
    r.allocatedTable = table;
    if (r.payNow && !r.paymentId) {
      // Pay Now: hold the table and ask for payment within the payment window (same rule as orders).
      r.status = "awaiting_payment";
      r.payBy = Date.now() + env.paymentWindowMs;
      notify(r.customerId, "reservation_accepted", "Restaurant confirmed your table", `${r.merchantName} confirmed table ${table} for ${r.date} ${r.time}. Pay RM${amountDue(r).toFixed(2)} to secure it.`, { reservationId: r.id, payBy: r.payBy });
    } else {
      r.status = "confirmed";
      notify(r.customerId, "reservation_confirmed", "Table confirmed", `${r.merchantName} confirmed your table (${table}) for ${r.date} ${r.time}.`, { reservationId: r.id });
    }
  } else {
    r.status = "declined";
    refundAll(r, "Reservation declined");
    notify(r.customerId, "reservation_declined", "Reservation declined", `${r.merchantName} could not take your booking.${r.paid ? " Your payment was refunded." : ""}`, { reservationId: r.id });
  }
}

export function expireReservation(r: Reservation) {
  r.status = "expired";
  refundAll(r, "Restaurant did not reply in time");
  notify(r.customerId, "reservation_expired", "Reservation expired", `${r.merchantName} did not reply in time.${r.paid ? " Your payment was refunded." : ""}`, { reservationId: r.id });
}

/** What the customer must pay for a Pay Now booking: deposit + every pre-order dish the restaurant has not declined. */
export function amountDue(r: Reservation): number {
  if (!r.payNow || r.paymentId) return 0;
  return money(env.bookingDeposit + r.preorder.filter((p) => p.status !== "declined").reduce((s, p) => s + p.price * p.qty, 0));
}

/** Customer pays after the restaurant confirmed (simulated Stripe). The booking is then confirmed. */
export function payReservation(r: Reservation, card: unknown) {
  if (r.status !== "awaiting_payment") throw new HttpError(409, "This booking is not waiting for payment");
  if (!r.payBy || Date.now() > r.payBy) throw new HttpError(409, "The payment window has passed. Please book again.");
  const p = charge(amountDue(r), card, r.id);
  r.paymentId = p.id;
  r.paid = p.amount;
  r.status = "confirmed";
  r.payBy = undefined;
  notifyMerchant(r.merchantId, "reservation_paid", "Reservation paid", `${r.customerName} paid for ${r.date} ${r.time}. The table is confirmed.`, { reservationId: r.id });
}

/** Payment window ran out: the table is released and nothing was charged. */
export function expireUnpaidReservation(r: Reservation) {
  r.status = "expired";
  r.cancelReason = "not_paid";
  r.payBy = undefined;
  notify(r.customerId, "reservation_expired", "Reservation cancelled", `You did not pay in time, so ${r.merchantName} released your table. Nothing was charged.`, { reservationId: r.id });
  notifyMerchant(r.merchantId, "reservation_cancelled", "Reservation not paid", `${r.customerName} did not pay for ${r.date} ${r.time}. The table is free again.`, { reservationId: r.id });
}

// FR-5.10: a declined dish does not cancel the reservation.
export function decidePreorder(r: Reservation, itemId: string, approve: boolean) {
  if (!["awaiting_restaurant", "awaiting_payment", "confirmed"].includes(r.status)) throw new HttpError(409, "Reservation is closed");
  const it = r.preorder.find((p) => p.id === itemId);
  if (!it) throw new HttpError(404, "Pre-order item not found");
  if (it.status !== "pending") throw new HttpError(409, "Already answered");
  it.status = approve ? "approved" : "declined";
  if (!approve && r.paymentId) r.refunded = money(r.refunded + refund(r.paymentId, it.price * it.qty, `Pre-order declined: ${it.name}`));
  notify(r.customerId, approve ? "preorder_approved" : "preorder_declined", approve ? "Pre-order approved" : "Pre-order item declined",
    `${r.merchantName} ${approve ? "approved" : "declined"} ${it.qty} x ${it.name}.${!approve && r.paymentId ? " That amount was refunded." : ""}`, { reservationId: r.id });
}

export function cancelReservation(r: Reservation) {
  if (!["awaiting_restaurant", "awaiting_payment", "confirmed"].includes(r.status)) throw new HttpError(409, "This reservation can no longer be cancelled");
  if (slotEpoch(r.date, r.time) - Date.now() < env.reservationCutoffMs) throw new HttpError(409, `Cancellations close ${Math.round(env.reservationCutoffMs / 60000)} minutes before the slot`);
  r.status = "cancelled";
  refundAll(r, "Cancelled by customer");
  notifyMerchant(r.merchantId, "reservation_cancelled", "Reservation cancelled", `${r.customerName} cancelled ${r.date} ${r.time}.`, { reservationId: r.id });
}

export function modifyReservation(r: Reservation, b: { date?: string; time?: string; partySize?: number; specialRequest?: string }) {
  if (!["awaiting_restaurant", "awaiting_payment", "confirmed"].includes(r.status)) throw new HttpError(409, "This reservation can no longer be changed");
  if (slotEpoch(r.date, r.time) - Date.now() < env.reservationCutoffMs) throw new HttpError(409, `Changes close ${Math.round(env.reservationCutoffMs / 60000)} minutes before the slot`);
  const date = b.date ?? r.date, time = b.time ?? r.time;
  checkSlot(r.merchantId, date, time);
  const party = b.partySize ?? r.partySize;
  if (!Number.isInteger(party) || party < 1 || party > 20) throw new HttpError(400, "Party size must be 1-20");
  const changedSlot = date !== r.date || time !== r.time || party !== r.partySize;
  r.date = date; r.time = time; r.partySize = party;
  if (b.specialRequest !== undefined) r.specialRequest = String(b.specialRequest).slice(0, 200) || undefined;
  if (changedSlot) {
    // A new slot needs the restaurant's approval again.
    r.status = "awaiting_restaurant"; r.allocatedTable = undefined; r.reminded = false; r.payBy = undefined;
    r.respondBy = Date.now() + env.reservationResponseMs;
    notifyMerchant(r.merchantId, "new_reservation", "Reservation changed", `${r.customerName} changed to ${date} ${time}, party of ${party}.`, { reservationId: r.id });
  }
}

/** Merchant moves a confirmed booking to another table. */
export function reassignTable(r: Reservation, table: string) {
  if (r.status !== "confirmed" && r.status !== "awaiting_payment") throw new HttpError(409, "Only confirmed bookings have a table");
  r.allocatedTable = table;
  notify(r.customerId, "reservation_table", "Table changed", `${r.merchantName} moved your booking to ${table}.`, { reservationId: r.id });
}

/** Merchant cancels a confirmed booking (customer is notified and refunded). */
export function merchantCancel(r: Reservation) {
  if (r.status !== "confirmed" && r.status !== "awaiting_payment") throw new HttpError(409, "Only confirmed bookings can be cancelled here");
  r.status = "cancelled";
  refundAll(r, "Cancelled by restaurant");
  notify(r.customerId, "reservation_declined", "Booking cancelled", `${r.merchantName} had to cancel your booking.${r.paid ? " Your payment was refunded." : ""}`, { reservationId: r.id });
}
