import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

let seq = 10250;
export const nextOrderId = () => `SM-${++seq}`;
let rseq = 5000;
export const nextReservationId = () => `RS-${++rseq}`;
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
