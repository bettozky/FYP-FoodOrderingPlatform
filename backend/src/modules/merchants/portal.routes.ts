import { Router } from "express";
import { HttpError, int, money, str } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { approvedMerchant, auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Dish } from "../../store/types.js";
import { merchantView } from "./merchants.view.js";

/** Merchant management (FR-5.1 to FR-5.4, FR-5.11 to FR-5.13). */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const portalRouter = Router();
portalRouter.use(auth("merchant"));

portalRouter.get("/me", (_req, res) => {
  const u = currentUser(res);
  const m = u.merchantId ? db.merchants.get(u.merchantId) : undefined;
  if (!m) throw new HttpError(404, "No business profile");
  res.json({ serverNow: Date.now(), merchant: { ...merchantView(m), approval: m.approval } });
});

portalRouter.patch("/me", (req, res) => {
  const m = approvedMerchant(res);
  const b = req.body ?? {};
  if (b.storeMode !== undefined) {
    if (!["online", "dine_in", "offline"].includes(b.storeMode)) throw new HttpError(400, "Unknown store mode");
    m.storeMode = b.storeMode;
  }
  if (b.hours) {
    for (const t of [b.hours.open, b.hours.close]) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t))) throw new HttpError(400, "Times must look like 09:00");
    m.hours = { open: b.hours.open, close: b.hours.close };
    delete m.weeklyHours; // one pair of times now applies to every day
  }
  if (Array.isArray(b.weeklyHours)) {
    const rows = (b.weeklyHours as any[]).filter((h) => Number.isInteger(h?.day) && h.day >= 0 && h.day <= 6 && TIME.test(String(h.open)) && TIME.test(String(h.close)))
      .map((h) => ({ day: h.day as number, open: String(h.open), close: String(h.close) }));
    m.weeklyHours = rows;
    if (rows[0]) m.hours = { open: rows[0].open, close: rows[0].close };
  }
  if (b.prepMinutes !== undefined) m.prepMinutes = int(b.prepMinutes, "Prep time", 1, 180);
  res.json({ merchant: merchantView(m) });
});

function ownDish(res: import("express").Response, id: string): Dish {
  const m = approvedMerchant(res);
  const d = db.dishes.get(id);
  if (!d || d.merchantId !== m.id) throw new HttpError(404, "Dish not found");
  return d;
}

portalRouter.get("/dishes", (_req, res) => {
  const m = approvedMerchant(res);
  res.json({ dishes: [...db.dishes.values()].filter((d) => d.merchantId === m.id) });
});

/** A dish picture is a photo link (https://... or /media/...). Empty means "no photo yet"; the apps show a plain icon. */
function dishImage(v: unknown): string {
  const t = typeof v === "string" ? v.trim() : "";
  if (!t) return "";
  if (/^(https?:\/\/|\/media\/)/i.test(t) && t.length <= 400) return t;
  if (t.length <= 8) return t; // older data: a single emoji
  throw new HttpError(400, "Photo must be a link starting with https:// (or leave it empty)");
}

function dishFields(b: Record<string, unknown>, base?: Dish): Omit<Dish, "id" | "merchantId"> {
  const price = Number(b.price ?? base?.price);
  if (!Number.isFinite(price) || price <= 0 || price > 500) throw new HttpError(400, "Price must be above 0");
  const dietary = Array.isArray(b.dietary) ? (b.dietary as unknown[]).map(String).slice(0, 6) : base?.dietary ?? [];
  const style = b.style === "dry" || b.style === "wet" ? b.style : b.style === "" ? undefined : base?.style;
  return {
    name: str(b.name ?? base?.name, "Name", { max: 80 }),
    price: money(price),
    image: dishImage(b.image ?? base?.image),
    description: str(b.description ?? base?.description ?? "", "Description", { max: 300, optional: true }),
    category: str(b.category ?? base?.category ?? "Mains", "Category", { max: 40 }),
    calories: b.calories === undefined ? base?.calories ?? 0 : int(b.calories, "Calories", 0, 5000),
    soldOut: typeof b.soldOut === "boolean" ? b.soldOut : base?.soldOut ?? false,
    cost: b.cost === undefined ? base?.cost : Math.max(0, Number(b.cost) || 0),
    stock: b.stock === undefined ? base?.stock : Math.max(0, Math.floor(Number(b.stock) || 0)),
    spicy: dietary.includes("spicy"),
    dietary, style,
    customisations: Array.isArray(b.customisations)
      ? (b.customisations as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 12)
      : base?.customisations ?? [],
  };
}

portalRouter.post("/dishes", (req, res) => {
  const m = approvedMerchant(res);
  const d: Dish = { id: uid("d"), merchantId: m.id, ...dishFields(req.body ?? {}) };
  db.dishes.set(d.id, d);
  res.status(201).json({ dish: d });
});

portalRouter.patch("/dishes/:id", (req, res) => {
  const d = ownDish(res, req.params.id as string);
  Object.assign(d, dishFields(req.body ?? {}, d));
  res.json({ dish: d });
});

portalRouter.delete("/dishes/:id", (req, res) => {
  const d = ownDish(res, req.params.id as string);
  db.dishes.delete(d.id);
  res.json({ ok: true });
});

// FR-5.3: suspend a whole category without deleting it.
portalRouter.post("/categories/:name/sold-out", (req, res) => {
  const m = approvedMerchant(res);
  const soldOut = req.body?.soldOut !== false;
  let n = 0;
  for (const d of db.dishes.values()) if (d.merchantId === m.id && d.category === req.params.name) { d.soldOut = soldOut; n++; }
  res.json({ updated: n });
});

// FR-5.11: promotions / vouchers created by the merchant.
portalRouter.get("/vouchers", (_req, res) => {
  const m = approvedMerchant(res);
  res.json({ vouchers: db.vouchers.filter((v) => v.merchantId === m.id) });
});
portalRouter.post("/vouchers", (req, res) => {
  const m = approvedMerchant(res);
  const b = req.body ?? {};
  const amount = Number(b.amount), minSpend = Number(b.minSpend ?? 0);
  const kind = b.kind === "percent" ? "percent" : "fixed";
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Discount must be above 0");
  if (kind === "percent" && amount > 100) throw new HttpError(400, "A percentage discount cannot be above 100");
  if (!Number.isFinite(minSpend) || minSpend < 0) throw new HttpError(400, "Minimum spend cannot be negative");
  const limit = b.totalLimit === undefined || b.totalLimit === "" ? undefined : int(b.totalLimit, "Total limit", 1, 100000);
  const title = str(b.title, "Voucher code", { max: 30 }).toUpperCase();
  const v = {
    id: uid("v"), title,
    description: str(b.description, "Description", { max: 120, optional: true }) || `${kind === "percent" ? `${amount}% off` : `RM${amount} off`}, min spend RM${minSpend} at ${m.name}`,
    amount: money(amount), kind: kind as "fixed" | "percent", minSpend: money(minSpend), merchantId: m.id,
    totalLimit: limit, claimed: 0, costSpent: 0, expiryDate: b.expiryDate ? str(b.expiryDate, "Expiry date", { max: 10 }) : undefined, active: true,
  };
  db.vouchers.push(v);
  res.status(201).json({ voucher: v });
});
portalRouter.patch("/vouchers/:id", (req, res) => {
  const m = approvedMerchant(res);
  const v = db.vouchers.find((x) => x.id === req.params.id && x.merchantId === m.id);
  if (!v) throw new HttpError(404, "Voucher not found");
  if (typeof req.body?.active === "boolean") v.active = req.body.active;
  res.json({ voucher: v });
});
portalRouter.delete("/vouchers/:id", (req, res) => {
  const m = approvedMerchant(res);
  const i = db.vouchers.findIndex((v) => v.id === req.params.id && v.merchantId === m.id);
  if (i < 0) throw new HttpError(404, "Voucher not found");
  db.vouchers.splice(i, 1);
  res.json({ ok: true });
});

// FR-5.13: job vacancies.
portalRouter.get("/jobs", (_req, res) => {
  const m = approvedMerchant(res);
  const apps = [...db.applications.values()].filter((a) => a.merchantId === m.id);
  res.json({
    jobs: [...db.jobs.values()].filter((j) => j.merchantId === m.id).map((j) => ({
      ...j, applicants: apps.filter((a) => a.jobId === j.id && a.status !== "withdrawn").length, newApplicants: apps.filter((a) => a.jobId === j.id && a.status === "submitted").length,
    })),
  });
});
portalRouter.post("/jobs", (req, res) => {
  const m = approvedMerchant(res);
  const b = req.body ?? {};
  const j = {
    id: uid("j"), merchantId: m.id, merchantName: m.name, title: str(b.title, "Job title", { max: 80 }),
    type: str(b.type, "Type", { optional: true, max: 30 }) || "Part-time", pay: str(b.pay, "Pay", { max: 40 }),
    description: str(b.description, "Description", { optional: true, max: 300 }), postedAt: Date.now(), open: true,
    role: str(b.role, "Role", { optional: true, max: 40 }) || undefined,
    openings: b.openings === undefined ? 1 : int(b.openings, "Openings", 1, 100),
    perks: str(b.perks, "Perks", { optional: true, max: 200 }) || undefined, applicants: 0,
  };
  db.jobs.set(j.id, j);
  res.status(201).json({ job: j });
});
portalRouter.patch("/jobs/:id", (req, res) => {
  const m = approvedMerchant(res);
  const j = db.jobs.get(req.params.id as string);
  if (!j || j.merchantId !== m.id) throw new HttpError(404, "Job not found");
  const b = req.body ?? {};
  if (typeof b.open === "boolean") j.open = b.open;
  if (b.title !== undefined) j.title = str(b.title, "Job title", { max: 80 });
  if (b.pay !== undefined) j.pay = str(b.pay, "Pay", { max: 40 });
  if (b.type !== undefined) j.type = str(b.type, "Type", { max: 30 });
  if (b.description !== undefined) j.description = str(b.description, "Description", { optional: true, max: 300 });
  if (b.role !== undefined) j.role = str(b.role, "Role", { optional: true, max: 40 });
  if (b.perks !== undefined) j.perks = str(b.perks, "Perks", { optional: true, max: 200 });
  if (b.openings !== undefined) j.openings = int(b.openings, "Openings", 1, 100);
  res.json({ job: j });
});
portalRouter.delete("/jobs/:id", (req, res) => {
  const m = approvedMerchant(res);
  const j = db.jobs.get(req.params.id as string);
  if (!j || j.merchantId !== m.id) throw new HttpError(404, "Job not found");
  db.jobs.delete(j.id);
  // Applications for a deleted vacancy stay in the shop's inbox (with the title they applied to) so nobody's application vanishes.
  res.json({ ok: true });
});
