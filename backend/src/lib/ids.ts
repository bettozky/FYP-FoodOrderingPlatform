import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

let seq = 10250;
export const nextOrderId = () => `SM-${++seq}`;
let rseq = 5000;
export const nextReservationId = () => `RS-${++rseq}`;

/** After loading saved data, continue the order / reservation numbers from the highest one already used. */
export function syncSequences(orderIds: Iterable<string>, reservationIds: Iterable<string>) {
  for (const id of orderIds) { const n = /^SM-(\d+)$/.exec(id); if (n) seq = Math.max(seq, Number(n[1])); }
  for (const id of reservationIds) { const n = /^RS-(\d+)$/.exec(id); if (n) rseq = Math.max(rseq, Number(n[1])); }
}
export const uid = (p: string) => `${p}_${randomBytes(4).toString("hex")}`;

export function hashPassword(pw: string): string {
  const salt = randomBytes(8).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}
export function checkPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}
