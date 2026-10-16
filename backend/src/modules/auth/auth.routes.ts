import { Router } from "express";
import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { HttpError, str } from "../../lib/http.js";
import { checkPassword, hashPassword, uid } from "../../lib/ids.js";
import { ageOn } from "../../lib/time.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { User } from "../../store/types.js";

export const authRouter = Router();

function session(u: User) {
  const token = randomBytes(24).toString("hex");
  db.tokens.set(token, u.id);
  return { token, user: publicUser(u) };
}

export function publicUser(u: User) {
  const m = u.merchantId ? db.merchants.get(u.merchantId) : undefined;
  return {
    id: u.id, role: u.role, email: u.email, name: u.name, phone: u.phone, dob: u.dob,
    merchant: m ? { id: m.id, name: m.name, approval: m.approval } : undefined,
  };
}

function checkEmail(raw: unknown): string {
  const email = str(raw, "Email", { max: 120 }).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Enter a valid email address");
  if ([...db.users.values()].some((u) => u.email === email)) throw new HttpError(409, "That email is already registered");
  return email;
}
function checkPw(raw: unknown): string {
  const pw = str(raw, "Password", { max: 100 });
  if (pw.length < 6) throw new HttpError(400, "Password must be at least 6 characters");
  return pw;
}

// FR-1.1 / FR-1.2: customers register with a date of birth; under-age sign-ups are blocked.
authRouter.post("/register", (req, res) => {
  const b = req.body ?? {};
  const name = str(b.name, "Name", { max: 80 });
  const dob = str(b.dob, "Date of birth");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) throw new HttpError(400, "Date of birth must be YYYY-MM-DD");
  if (ageOn(dob) < 0) throw new HttpError(400, "Date of birth cannot be in the future");
  if (ageOn(dob) < env.minAge) throw new HttpError(403, `You must be at least ${env.minAge} years old to use ScootMeal.`);
  const email = checkEmail(b.email);
  const u: User = {
    id: uid("u"), role: "customer", email, name, dob, phone: str(b.phone, "Phone", { optional: true, max: 30 }) || undefined,
    passwordHash: hashPassword(checkPw(b.password)),
  };
  db.users.set(u.id, u);
  res.status(201).json(session(u));
});

// FR-5.1: merchant sign-up creates a PENDING business that an admin must approve.
authRouter.post("/register-merchant", (req, res) => {
  const b = req.body ?? {};
  const email = checkEmail(b.email);
  const pw = checkPw(b.password);
  const businessName = str(b.businessName, "Business name", { max: 80 });
  const id = uid("m");
  const hours = { open: str(b.open, "Opening time", { optional: true }) || "09:00", close: str(b.close, "Closing time", { optional: true }) || "21:00" };
  for (const t of [hours.open, hours.close]) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) throw new HttpError(400, "Times must look like 09:00");
  const u: User = {
    id: uid("u"), role: "merchant", email, name: str(b.ownerName, "Owner name", { max: 80 }),
    phone: str(b.phone, "Phone", { max: 30 }), passwordHash: hashPassword(pw), merchantId: id,
  };
  db.users.set(u.id, u);
  db.merchants.set(id, {
    id, name: businessName, stallNo: str(b.stallNo, "Stall / address", { optional: true, max: 80 }) || "TBC",
    rating: 0, lat: 1.5533 + (Math.random() - 0.5) * 0.01, lng: 110.3592 + (Math.random() - 0.5) * 0.01,
    prepMinutes: 15, tags: [str(b.cuisine, "Cuisine", { optional: true, max: 40 }) || "Food"], color: "#C97F03",
    hours, approval: "pending", storeMode: "online", phone: u.phone!, ownerUserId: u.id,
  });
  res.status(201).json(session(u));
});

authRouter.post("/login", (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const u = [...db.users.values()].find((x) => x.email === email);
  if (!u || !checkPassword(String(req.body?.password ?? ""), u.passwordHash)) throw new HttpError(401, "Wrong email or password");
  const want = req.body?.role;
  if (want && want !== u.role) throw new HttpError(403, `This is a ${u.role} account. Use the ${u.role} app.`);
  res.json(session(u));
});

authRouter.get("/me", auth(), (_req, res) => res.json({ user: publicUser(currentUser(res)) }));
authRouter.post("/logout", auth(), (req, res) => {
  db.tokens.delete((req.headers.authorization ?? "").slice(7));
  res.json({ ok: true });
});
