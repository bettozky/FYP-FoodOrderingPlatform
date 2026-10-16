// Simulated Stripe (FR-2.4). Card data is only inspected to pick a test outcome and is never stored (NFR-5).
import { HttpError, money } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { db } from "../../store/db.js";
import type { Payment } from "../../store/types.js";

export function charge(amount: number, cardNumber: unknown, forId: string): Payment {
  const digits = String(cardNumber ?? "").replace(/\D/g, "");
  if (digits.length < 12) throw new HttpError(400, "Enter a valid card number (test card: 4242 4242 4242 4242)");
  if (digits.endsWith("0002")) throw new HttpError(402, "Your card was declined. Try another card (test card: 4242 4242 4242 4242).");
  const p: Payment = {
    id: uid("pay"), ref: `pi_sim_${uid("")}`, amount: money(amount), refunded: 0, status: "succeeded",
    refunds: [], createdAt: Date.now(), for: forId,
  };
  db.payments.set(p.id, p);
  return p;
}

/** Refund up to what is left on the payment. Returns the amount actually refunded. */
export function refund(paymentId: string | undefined, amount: number, reason: string): number {
  const p = paymentId ? db.payments.get(paymentId) : undefined;
  if (!p) return 0;
  const amt = money(Math.min(amount, p.amount - p.refunded));
  if (amt <= 0) return 0;
  p.refunded = money(p.refunded + amt);
  p.refunds.push({ amount: amt, reason, at: Date.now() });
  p.status = p.refunded >= p.amount ? "refunded" : "partially_refunded";
  return amt;
}
