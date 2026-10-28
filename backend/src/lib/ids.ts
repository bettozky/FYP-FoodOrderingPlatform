import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

let seq = 10250;
export const nextOrderId = () => `SM-${++seq}`;
let rseq = 5000;
export const nextReservationId = () => `RS-${++rseq}`;
export const uid = (p: string) => `${p}_${randomBytes(4).toString("hex")}`;

// bcrypt, the same format the database seed uses (users.password_hash).
export const hashPassword = (pw: string): string => bcrypt.hashSync(pw, 10);
export const checkPassword = (pw: string, stored: string): boolean => bcrypt.compareSync(pw, stored);
