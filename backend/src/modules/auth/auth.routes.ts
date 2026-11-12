import { Router } from "express";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { HttpError, money, str } from "../../lib/http.js";
import { checkPassword, hashPassword, uid } from "../../lib/ids.js";
import { ageOn } from "../../lib/time.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { db } from "../../store/db.js";
import type { Dish, Merchant, User } from "../../store/types.js";
import { emailConfigured, sendMail } from "../../lib/mailer.js";
import { notify } from "../notifications/notifications.service.js";
import { verifyGoogleIdToken } from "../../lib/googleToken.js";

export const authRouter = Router();
authRouter.use(["/login", "/google", "/register", "/register-merchant", "/password", "/forgot", "/reset"], rateLimit(env.authRatePerMin, "auth"));

function session(u: User) {
  const token = randomBytes(24).toString("hex");
  db.tokens.set(token, u.id);
  db.tokenExpiry.set(token, Date.now() + env.sessionDays * 86400000);
  return { token, user: publicUser(u) };
}

export function publicUser(u: User) {
  const m = u.merchantId ? db.merchants.get(u.merchantId) : undefined;
  return {
    id: u.id, role: u.role, email: u.email, name: u.name, phone: u.phone, dob: u.dob, avatar: u.avatar,
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

// "Continue with Google" (customer app). The app sends the Google ID token; the server checks it, then either signs the person in
// (matching their Google id, or the same verified email) or creates a customer account. A new account needs a date of birth for the
// age rule, so the first call answers { needsDob: true } and the app asks for it and calls again with `dob`.
authRouter.post("/google", async (req, res) => {
  const g = await verifyGoogleIdToken(req.body?.idToken);
  const users = [...db.users.values()];
  let u = users.find((x) => x.googleSub === g.sub) ?? users.find((x) => x.email === g.email);
  if (u) {
    if (u.role !== "customer") throw new HttpError(403, `This email belongs to a ${u.role} account. Use the ${u.role} app.`);
    if (u.suspended) throw new HttpError(403, "Your account has been suspended. Please contact the ScootMeal admin.");
    if (!u.googleSub) u.googleSub = g.sub; // first Google sign-in on an existing account with the same verified email
    return res.json(session(u));
  }
  const dob = typeof req.body?.dob === "string" ? req.body.dob.trim() : "";
  if (!dob) return res.json({ needsDob: true, name: g.name, email: g.email });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) throw new HttpError(400, "Date of birth must be YYYY-MM-DD");
  if (ageOn(dob) < 0) throw new HttpError(400, "Date of birth cannot be in the future");
  if (ageOn(dob) < env.minAge) throw new HttpError(403, `You must be at least ${env.minAge} years old to use ScootMeal.`);
  u = {
    id: uid("u"), role: "customer", email: g.email, name: g.name, dob, googleSub: g.sub, noPassword: true,
    phone: str(req.body?.phone, "Phone", { optional: true, max: 30 }) || undefined,
    passwordHash: hashPassword(randomBytes(24).toString("hex")),
    ...(g.picture ? { avatar: g.picture } : {}),
  };
  db.users.set(u.id, u);
  res.status(201).json(session(u));
});

const isTime = (t: unknown): t is string => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const DAY_NUMBER: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// FR-5.1: merchant sign-up creates a PENDING business that an admin must approve.
// The merchant app's wizard also sends `application` (see apps/merchant-app/src/modules/onboarding/README.md):
// its per-day hours, location, prep time and starter menu are used here, and the whole object is kept for the admin.
authRouter.post("/register-merchant", (req, res) => {
  const b = req.body ?? {};
  const email = checkEmail(b.email);
  const pw = checkPw(b.password);
  const businessName = str(b.businessName, "Business name", { max: 80 });
  const hours = { open: str(b.open, "Opening time", { optional: true }) || "09:00", close: str(b.close, "Closing time", { optional: true }) || "21:00" };
  for (const t of [hours.open, hours.close]) if (!isTime(t)) throw new HttpError(400, "Times must look like 09:00");
  if (hours.open === hours.close) throw new HttpError(400, "Opening and closing times must be different");

  const application: Record<string, any> | null = b.application && typeof b.application === "object" ? b.application : null;
  const loc = application?.location ?? {};
  const service = application?.service ?? {};

  // Closed days get no row. Without per-day hours, open/close applies every day.
  const weeklyHours = (Array.isArray(service.hours) ? service.hours : [])
    .filter((h: any) => h && !h.closed && h.day in DAY_NUMBER && isTime(h.open) && isTime(h.close) && h.open !== h.close)
    .map((h: any) => ({ day: DAY_NUMBER[h.day]!, open: h.open as string, close: h.close as string }));

  const id = uid("m");
  const menu: Dish[] = (Array.isArray(application?.menuItems) ? application!.menuItems : [])
    .filter((x: any) => typeof x?.name === "string" && x.name.trim() && finite(x.price) && x.price > 0 && x.price <= 500)
    .slice(0, 30)
    .map((x: any): Dish => ({
      id: uid("d"), merchantId: id, name: x.name.trim().slice(0, 80), price: money(x.price), image: "",
      description: typeof x.description === "string" ? x.description.trim().slice(0, 300) : "",
      category: "Mains", calories: 0, soldOut: false, spicy: false, dietary: [], customisations: [],
    }));

  const prep = Number(service.prepMinutes);
  const u: User = {
    id: uid("u"), role: "merchant", email, name: str(b.ownerName, "Owner name", { max: 80 }),
    phone: str(b.phone, "Phone", { max: 30 }), passwordHash: hashPassword(pw), merchantId: id,
  };
  const merchant: Merchant = {
    id, name: businessName, stallNo: str(b.stallNo, "Stall / address", { optional: true, max: 80 }) || "TBC",
    rating: 0,
    lat: finite(loc.lat) ? loc.lat : 1.5533 + (Math.random() - 0.5) * 0.01,
    lng: finite(loc.lng) ? loc.lng : 110.3592 + (Math.random() - 0.5) * 0.01,
    prepMinutes: Number.isInteger(prep) && prep >= 1 && prep <= 180 ? prep : 15,
    tags: (str(b.cuisine, "Cuisine", { optional: true, max: 80 }) || "Food").split(",").map((s) => s.trim()).filter(Boolean),
    color: "#C97F03", hours: weeklyHours[0] ? { open: weeklyHours[0].open, close: weeklyHours[0].close } : hours,
    ...(weeklyHours.length ? { weeklyHours } : {}),
    approval: "pending", storeMode: "online", phone: u.phone!, ownerUserId: u.id,
    ...(application ? { application } : {}),
  };
  db.users.set(u.id, u);
  db.merchants.set(id, merchant);
  menu.forEach((d) => db.dishes.set(d.id, d));
  for (const a of db.users.values()) {
    if (a.role === "admin") notify(a.id, "merchant_signup", "New shop to review", `${businessName} signed up and is waiting for approval.`, { merchantId: id });
  }
  res.status(201).json(session(u));
});

authRouter.post("/login", (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const u = [...db.users.values()].find((x) => x.email === email);
  if (!u || !checkPassword(String(req.body?.password ?? ""), u.passwordHash)) throw new HttpError(401, "Wrong email or password");
  if (u.suspended) throw new HttpError(403, "Your account has been suspended. Please contact the ScootMeal admin.");
  const want = req.body?.role;
  if (want && want !== u.role) throw new HttpError(403, `This is a ${u.role} account. Use the ${u.role} app.`);
  res.json(session(u));
});

authRouter.get("/me", auth(), (_req, res) => res.json({ user: publicUser(currentUser(res)) }));

// Edit my profile: name, phone, avatar (a short text such as an emoji or an image link).
authRouter.patch("/me", auth(), (req, res) => {
  const u = currentUser(res);
  const b = req.body ?? {};
  if (b.name !== undefined) u.name = str(b.name, "Name", { max: 80 });
  if (b.phone !== undefined) u.phone = str(b.phone, "Phone", { optional: true, max: 30 }) || undefined;
  if (b.avatar !== undefined) u.avatar = str(b.avatar, "Avatar", { optional: true, max: 400 }) || undefined;
  res.json({ user: publicUser(u) });
});

authRouter.post("/password", auth(), (req, res) => {
  const u = currentUser(res);
  if (!checkPassword(String(req.body?.currentPassword ?? ""), u.passwordHash)) throw new HttpError(403, "Your current password is wrong");
  u.passwordHash = hashPassword(checkPw(req.body?.newPassword));
  // keep this device signed in, sign every other device out
  const keep = (req.headers.authorization ?? "").slice(7);
  for (const [t, id] of db.tokens) if (id === u.id && t !== keep) { db.tokens.delete(t); db.tokenExpiry.delete(t); }
  res.json({ ok: true });
});

// Delete my account (customers only). Needs the password. Not possible while an order or booking is still open.
// Orders and payments stay for the shops' records but lose their link to the person; reviews stay as "Deleted user".
authRouter.delete("/me", auth("customer"), (req, res) => {
  const u = currentUser(res);
  if (!checkPassword(String(req.body?.password ?? ""), u.passwordHash)) throw new HttpError(403, "Your password is wrong");
  const open = [...db.orders.values()].some((o) => o.customerId === u.id && ["awaiting_merchant", "awaiting_payment", "preparing"].includes(o.status));
  const booked = [...db.reservations.values()].some((r) => r.customerId === u.id && ["awaiting_restaurant", "awaiting_payment", "confirmed"].includes(r.status));
  if (open || booked) throw new HttpError(409, "Finish or cancel your open orders and table bookings first");
  for (const [t, id] of db.tokens) if (id === u.id) { db.tokens.delete(t); db.tokenExpiry.delete(t); }
  for (const [id, a] of db.addresses) if (a.userId === u.id) db.addresses.delete(id);
  db.favourites.delete(u.id);
  for (const [id, n] of db.notifications) if (n.userId === u.id) db.notifications.delete(id);
  for (const r of db.reviews) if (r.userId === u.id) r.userName = "Deleted user";
  db.users.delete(u.id);
  res.json({ ok: true });
});

// ---- forgot password: a 6-digit code is emailed, then used once to choose a new password ----
// The reply is the same whether or not the email is registered, so nobody can use this to find out who has an account.
const resetCodes = new Map<string, { hash: string; expires: number; tries: number; sentAt: number }>();
const hashCode = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex");

authRouter.post("/forgot", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Enter the email you signed up with");
  const reply: Record<string, unknown> = { ok: true, message: "If that email is registered, a 6-digit code has been sent. It works for " + env.resetCodeMinutes + " minutes." };
  const u = [...db.users.values()].find((x) => x.email === email && !x.suspended);
  const recent = resetCodes.get(email);
  if (u && u.role !== "admin" && !(recent && Date.now() - recent.sentAt < 60_000)) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    resetCodes.set(email, { hash: hashCode(email, code), expires: Date.now() + env.resetCodeMinutes * 60_000, tries: 0, sentAt: Date.now() });
    await sendMail(email, "Your ScootMeal password reset code", `Hi ${u.name},\n\nYour ScootMeal reset code is ${code}. It works for ${env.resetCodeMinutes} minutes.\nIf you did not ask for this, you can ignore this email.`).catch((e) => console.error("Could not send reset email:", e.message));
    if (env.resetCodeInResponse) reply.devCode = code; // testing only, see RESET_CODE_IN_RESPONSE
  }
  res.json({ ...reply, emailConfigured });
});

authRouter.post("/reset", (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const entry = resetCodes.get(email);
  const bad = new HttpError(400, "That code is wrong or has expired. Ask for a new one.");
  if (!entry || entry.expires < Date.now() || entry.tries >= 5) { resetCodes.delete(email); throw bad; }
  entry.tries++;
  const given = Buffer.from(hashCode(email, String(req.body?.code ?? "").trim()));
  const real = Buffer.from(entry.hash);
  if (given.length !== real.length || !timingSafeEqual(given, real)) throw bad;
  const u = [...db.users.values()].find((x) => x.email === email && !x.suspended);
  if (!u) throw bad;
  u.passwordHash = hashPassword(checkPw(req.body?.newPassword));
  resetCodes.delete(email);
  for (const [t, id] of db.tokens) if (id === u.id) { db.tokens.delete(t); db.tokenExpiry.delete(t); }
  res.json({ ok: true });
});

authRouter.post("/logout", auth(), (req, res) => {
  const token = (req.headers.authorization ?? "").slice(7);
  db.tokens.delete(token);
  db.tokenExpiry.delete(token);
  res.json({ ok: true });
});
