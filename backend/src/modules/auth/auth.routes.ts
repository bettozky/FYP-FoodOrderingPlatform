import { Router } from "express";
import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { HttpError, money, str } from "../../lib/http.js";
import { checkPassword, hashPassword } from "../../lib/ids.js";
import { ageOn } from "../../lib/time.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Merchant, User } from "../../store/types.js";
import { everyDay, type DishFields, type HoursRow } from "../merchants/merchants.repository.js";
import { notify } from "../notifications/notifications.service.js";
import { insertCustomer, insertMerchantSignup } from "./auth.repository.js";

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
authRouter.post("/register", async (req, res) => {
  const b = req.body ?? {};
  const name = str(b.name, "Name", { max: 80 });
  const dob = str(b.dob, "Date of birth");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) throw new HttpError(400, "Date of birth must be YYYY-MM-DD");
  if (ageOn(dob) < 0) throw new HttpError(400, "Date of birth cannot be in the future");
  if (ageOn(dob) < env.minAge) throw new HttpError(403, `You must be at least ${env.minAge} years old to use ScootMeal.`);
  const email = checkEmail(b.email);
  const fields: Omit<User, "id"> = {
    role: "customer", email, name, dob, phone: str(b.phone, "Phone", { optional: true, max: 30 }) || undefined,
    passwordHash: hashPassword(checkPw(b.password)),
  };
  const u: User = { id: await insertCustomer(fields), ...fields };
  db.users.set(u.id, u);
  res.status(201).json(session(u));
});

const isTime = (t: unknown): t is string => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const DAY_NUMBER: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// FR-5.1: merchant sign-up creates a PENDING business that an admin must approve.
// The merchant app's wizard also sends `application` (see apps/merchant-app/src/modules/onboarding/README.md):
// its per-day hours, location, prep time and starter menu are used here, and the whole object is kept for the admin.
authRouter.post("/register-merchant", async (req, res) => {
  const b = req.body ?? {};
  const email = checkEmail(b.email);
  const pw = checkPw(b.password);
  const businessName = str(b.businessName, "Business name", { max: 80 });
  const hours = { open: str(b.open, "Opening time", { optional: true }) || "09:00", close: str(b.close, "Closing time", { optional: true }) || "21:00" };
  for (const t of [hours.open, hours.close]) if (!isTime(t)) throw new HttpError(400, "Times must look like 09:00");
  if (hours.open === hours.close) throw new HttpError(400, "Opening and closing times must be different");

  const application = b.application && typeof b.application === "object" ? b.application : null;
  const loc = application?.location ?? {};
  const service = application?.service ?? {};

  // Closed days get no row. Without per-day hours, open/close applies every day.
  const perDay: HoursRow[] = (Array.isArray(service.hours) ? service.hours : [])
    .filter((h: any) => h && !h.closed && h.day in DAY_NUMBER && isTime(h.open) && isTime(h.close) && h.open !== h.close)
    .map((h: any) => ({ day: DAY_NUMBER[h.day]!, open: h.open, close: h.close }));

  const menu: DishFields[] = (Array.isArray(application?.menuItems) ? application.menuItems : [])
    .filter((x: any) => typeof x?.name === "string" && x.name.trim() && finite(x.price) && x.price > 0 && x.price <= 500)
    .slice(0, 30)
    .map((x: any) => ({
      name: x.name.trim().slice(0, 80), price: money(x.price), image: "🍽️",
      description: typeof x.description === "string" ? x.description.trim().slice(0, 300) : "",
      category: "Mains", calories: 0, soldOut: false, spicy: false, dietary: [], customisations: [],
    }));

  const prep = Number(service.prepMinutes);
  const user = {
    email, name: str(b.ownerName, "Owner name", { max: 80 }), phone: str(b.phone, "Phone", { max: 30 }), passwordHash: hashPassword(pw),
  };
  const merchant: Omit<Merchant, "id" | "ownerUserId"> = {
    name: businessName, stallNo: str(b.stallNo, "Stall / address", { optional: true, max: 80 }) || "TBC", rating: 0,
    lat: finite(loc.lat) ? loc.lat : 1.5533 + (Math.random() - 0.5) * 0.01,
    lng: finite(loc.lng) ? loc.lng : 110.3592 + (Math.random() - 0.5) * 0.01,
    prepMinutes: Number.isInteger(prep) && prep >= 1 && prep <= 180 ? prep : 15,
    tags: (str(b.cuisine, "Cuisine", { optional: true, max: 80 }) || "Food").split(",").map((s) => s.trim()).filter(Boolean),
    color: "#C97F03", hours, approval: "pending", storeMode: "online", phone: user.phone,
  };

  const ids = await insertMerchantSignup({ user, merchant, hours: perDay.length ? perDay : everyDay(hours), menu, application });
  const u: User = { id: ids.userId, role: "merchant", ...user, merchantId: ids.merchantId };
  db.users.set(u.id, u);
  db.merchants.set(ids.merchantId, { id: ids.merchantId, ...merchant, ownerUserId: u.id, application: application ?? undefined });
  menu.forEach((d, i) => db.dishes.set(ids.dishIds[i]!, { id: ids.dishIds[i]!, merchantId: ids.merchantId, ...d }));
  for (const a of db.users.values()) {
    if (a.role === "admin") notify(a.id, "merchant_signup", "New shop to review", `${businessName} signed up and is waiting for approval.`, { merchantId: ids.merchantId });
  }
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
