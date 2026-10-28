import { Router } from "express";
import { env } from "../../config/env.js";
import { distanceKm } from "../../lib/geo.js";
import { HttpError, int, money, str } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { isWithinHours } from "../../lib/time.js";
import { approvedMerchant, auth, currentUser } from "../../middleware/auth.js";
import { CAMPUS, db } from "../../store/db.js";
import type { Dish, Merchant } from "../../store/types.js";

/** Public catalog used by the customer app (browse, search, filter - FR-1.3 to FR-1.6). */
export const catalogRouter = Router();

export function merchantView(m: Merchant, from = CAMPUS) {
  const open = m.approval === "approved" && m.storeMode !== "offline" && isWithinHours(m.hours);
  return {
    id: m.id, name: m.name, stallNo: m.stallNo, rating: m.rating, prepMinutes: m.prepMinutes, tags: m.tags,
    color: m.color, hours: m.hours, venueCategory: m.venueCategory, phone: m.phone, lat: m.lat, lng: m.lng,
    storeMode: m.storeMode,
    openNow: open, // FR-1.6
    dineInOnly: m.storeMode === "dine_in",
    distanceKm: Math.round(distanceKm(from, m) * 100) / 100, // FR-1.5
  };
}

function origin(q: Record<string, unknown>) {
  const lat = Number(q.lat), lng = Number(q.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && q.lat !== undefined ? { lat, lng } : CAMPUS;
}

catalogRouter.get("/merchants", (req, res) => {
  const from = origin(req.query);
  const list = [...db.merchants.values()].filter((m) => m.approval === "approved").map((m) => merchantView(m, from));
  res.json({ serverNow: Date.now(), merchants: list });
});

catalogRouter.get("/dishes", (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const diet = String(req.query.dietary ?? "").split(",").filter(Boolean);
  const style = String(req.query.style ?? "");
  const merchantId = String(req.query.merchantId ?? "");
  const out = [...db.dishes.values()].filter((d) => {
    const m = db.merchants.get(d.merchantId);
    if (!m || m.approval !== "approved") return false;
    if (merchantId && d.merchantId !== merchantId) return false;
    if (q && !`${d.name} ${d.description} ${d.category} ${m.name}`.toLowerCase().includes(q)) return false;
    if (diet.length && !diet.every((t) => d.dietary.includes(t))) return false;
    if (style && d.style !== style) return false;
    return true;
  });
  res.json({ dishes: out });
});

catalogRouter.get("/dishes/:id/reviews", (req, res) => {
  const reviews = db.reviews.filter((r) => r.dishId === req.params.id).sort((a, b) => b.createdAt - a.createdAt);
  const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null;
  res.json({ average: avg, count: reviews.length, reviews });
});

catalogRouter.get("/venues", (req, res) => {
  const cat = String(req.query.category ?? "");
  const from = origin(req.query);
  const list = [...db.merchants.values()]
    .filter((m) => m.approval === "approved" && m.venueCategory && (!cat || m.venueCategory === cat))
    .map((m) => merchantView(m, from));
  res.json({ venues: list, categories: ["Trending", "Buffet", "Luxury", "Aesthetic Cafe"] });
});

catalogRouter.get("/vouchers", (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const usable = db.vouchers.filter((v) => v.active && (!v.expiryDate || v.expiryDate >= today) && (v.totalLimit === undefined || v.claimed < v.totalLimit));
  res.json({ vouchers: usable });
});

catalogRouter.get("/jobs", (_req, res) => {
  res.json({ jobs: [...db.jobs.values()].filter((j) => j.open).sort((a, b) => b.postedAt - a.postedAt) });
});

/** Merchant management (FR-5.1 to FR-5.4, FR-5.11 to FR-5.13). */
export const merchantRouter = Router();
merchantRouter.use(auth("merchant"));

merchantRouter.get("/me", (_req, res) => {
  const u = currentUser(res);
  const m = u.merchantId ? db.merchants.get(u.merchantId) : undefined;
  if (!m) throw new HttpError(404, "No business profile");
  res.json({ serverNow: Date.now(), merchant: { ...merchantView(m), approval: m.approval } });
});

merchantRouter.patch("/me", (req, res) => {
  const m = approvedMerchant(res);
  const b = req.body ?? {};
  if (b.storeMode !== undefined) {
    if (!["online", "dine_in", "offline"].includes(b.storeMode)) throw new HttpError(400, "Unknown store mode");
    m.storeMode = b.storeMode;
  }
  if (b.hours) {
    for (const t of [b.hours.open, b.hours.close]) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t))) throw new HttpError(400, "Times must look like 09:00");
    m.hours = { open: b.hours.open, close: b.hours.close };
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

merchantRouter.get("/dishes", (_req, res) => {
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

merchantRouter.post("/dishes", (req, res) => {
  const m = approvedMerchant(res);
  const d: Dish = { id: uid("d"), merchantId: m.id, ...dishFields(req.body ?? {}) };
  db.dishes.set(d.id, d);
  res.status(201).json({ dish: d });
});

merchantRouter.patch("/dishes/:id", (req, res) => {
  const d = ownDish(res, req.params.id as string);
  Object.assign(d, dishFields(req.body ?? {}, d));
  res.json({ dish: d });
});

merchantRouter.delete("/dishes/:id", (req, res) => {
  const d = ownDish(res, req.params.id as string);
  db.dishes.delete(d.id);
  res.json({ ok: true });
});

// FR-5.3: suspend a whole category without deleting it.
merchantRouter.post("/categories/:name/sold-out", (req, res) => {
  const m = approvedMerchant(res);
  const soldOut = req.body?.soldOut !== false;
  let n = 0;
  for (const d of db.dishes.values()) if (d.merchantId === m.id && d.category === req.params.name) { d.soldOut = soldOut; n++; }
  res.json({ updated: n });
});

merchantRouter.get("/stats", (req, res) => {
  const m = approvedMerchant(res);
  const period = String(req.query.period ?? "today");
  const now = new Date();
  const start = period === "all" ? 0
    : period === "week" ? Date.now() - 7 * 86400000
    : new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const orders = [...db.orders.values()].filter((o) => o.merchantId === m.id && o.createdAt >= start && ["preparing", "completed"].includes(o.status));
  const sold = new Map<string, { name: string; qty: number }>();
  let revenue = 0;
  for (const o of orders) {
    for (const i of o.items) {
      if (["out_of_stock", "cancelled"].includes(i.status)) continue;
      revenue += i.price * i.qty;
      const e = sold.get(i.dishId) ?? { name: i.name, qty: 0 };
      e.qty += i.qty;
      sold.set(i.dishId, e);
    }
  }
  res.json({
    period, orders: orders.length, revenue: money(revenue), avgPrepMinutes: m.prepMinutes,
    bestSellers: [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
  });
});

// FR-5.11: promotions / vouchers created by the merchant.
merchantRouter.get("/vouchers", (_req, res) => {
  const m = approvedMerchant(res);
  res.json({ vouchers: db.vouchers.filter((v) => v.merchantId === m.id) });
});
merchantRouter.post("/vouchers", (req, res) => {
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
merchantRouter.patch("/vouchers/:id", (req, res) => {
  const m = approvedMerchant(res);
  const v = db.vouchers.find((x) => x.id === req.params.id && x.merchantId === m.id);
  if (!v) throw new HttpError(404, "Voucher not found");
  if (typeof req.body?.active === "boolean") v.active = req.body.active;
  res.json({ voucher: v });
});
merchantRouter.delete("/vouchers/:id", (req, res) => {
  const m = approvedMerchant(res);
  const i = db.vouchers.findIndex((v) => v.id === req.params.id && v.merchantId === m.id);
  if (i < 0) throw new HttpError(404, "Voucher not found");
  db.vouchers.splice(i, 1);
  res.json({ ok: true });
});

// FR-5.13: job vacancies.
merchantRouter.get("/jobs", (_req, res) => {
  const m = approvedMerchant(res);
  res.json({ jobs: [...db.jobs.values()].filter((j) => j.merchantId === m.id) });
});
merchantRouter.post("/jobs", (req, res) => {
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
merchantRouter.patch("/jobs/:id", (req, res) => {
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
merchantRouter.delete("/jobs/:id", (req, res) => {
  const m = approvedMerchant(res);
  const j = db.jobs.get(req.params.id as string);
  if (!j || j.merchantId !== m.id) throw new HttpError(404, "Job not found");
  db.jobs.delete(j.id);
  res.json({ ok: true });
});

// FR-5.12: sales analytics for the Daily / Weekly / Monthly report screen.
merchantRouter.get("/analytics", (req, res) => {
  const m = approvedMerchant(res);
  const period = (["daily", "weekly", "monthly"].includes(String(req.query.period)) ? String(req.query.period) : "daily") as "daily" | "weekly" | "monthly";
  const DAY = 86400000;
  const span = period === "daily" ? DAY : period === "weekly" ? 7 * DAY : 30 * DAY;
  const now = Date.now();
  const mine = [...db.orders.values()].filter((o) => o.merchantId === m.id && ["preparing", "completed"].includes(o.status));
  const inRange = (o: { createdAt: number }, from: number, to: number) => o.createdAt >= from && o.createdAt < to;
  const cur = mine.filter((o) => inRange(o, now - span, now + 1));
  const prev = mine.filter((o) => inRange(o, now - 2 * span, now - span));

  const kept = (o: (typeof mine)[number]) => o.items.filter((i) => !["out_of_stock", "cancelled"].includes(i.status));
  const sum = (orders: typeof mine, f: (i: (typeof mine)[number]["items"][number]) => number) => orders.reduce((s, o) => s + kept(o).reduce((a, i) => a + f(i), 0), 0);
  const revenue = money(sum(cur, (i) => i.price * i.qty));
  const prevRevenue = sum(prev, (i) => i.price * i.qty);
  const cost = money(sum(cur, (i) => (db.dishes.get(i.dishId)?.cost ?? 0) * i.qty) + cur.reduce((s, o) => s + o.discount, 0));
  const profit = money(revenue - cost);

  const orderHas = (o: (typeof mine)[number], modes: string[]) => kept(o).some((i) => modes.includes(i.mode));

  // chart buckets
  const bars: { label: string; value: number }[] = [];
  if (period === "daily") {
    for (const h of [10, 12, 14, 16, 18, 20]) bars.push({ label: `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`, value: 0 });
    for (const o of cur) {
      const hr = Number(new Intl.DateTimeFormat("en-GB", { timeZone: env.timeZone, hour: "2-digit", hour12: false }).format(o.createdAt)) % 24;
      const idx = Math.min(Math.max(Math.floor((hr - 10) / 2), 0), 5);
      bars[idx]!.value += sum([o], (i) => i.price * i.qty);
    }
  } else if (period === "weekly") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let d = 6; d >= 0; d--) bars.push({ label: names[new Date(now - d * DAY).getDay()]!, value: 0 });
    for (const o of cur) bars[6 - Math.min(Math.floor((now - o.createdAt) / DAY), 6)]!.value += sum([o], (i) => i.price * i.qty);
  } else {
    const names = ["Wk1", "Wk2", "Wk3", "Wk4"];
    for (const n of names) bars.push({ label: n, value: 0 });
    for (const o of cur) bars[3 - Math.min(Math.floor((now - o.createdAt) / (7.5 * DAY)), 3)]!.value += sum([o], (i) => i.price * i.qty);
  }
  const max = Math.max(...bars.map((b) => b.value), 1);
  const chartBars = bars.map((b) => ({ label: b.label, value: Math.round(b.value), heightPct: `${Math.max(Math.round((b.value / max) * 100), b.value > 0 ? 8 : 2)}%` }));

  const tally = (orders: typeof mine) => {
    const map = new Map<string, { id: string; name: string; category: string; soldQty: number; revenue: number }>();
    for (const o of orders) for (const i of kept(o)) {
      const e = map.get(i.dishId) ?? { id: i.dishId, name: i.name, category: db.dishes.get(i.dishId)?.category ?? "", soldQty: 0, revenue: 0 };
      e.soldQty += i.qty; e.revenue = money(e.revenue + i.price * i.qty);
      map.set(i.dishId, e);
    }
    return map;
  };
  const curT = tally(cur), prevT = tally(prev);
  const bestSellers = [...curT.values()].sort((a, b) => b.soldQty - a.soldQty).slice(0, 5).map((b) => {
    const last = prevT.get(b.id)?.soldQty ?? 0;
    return { ...b, lastMonthQty: last, growthPct: last ? Math.round(((b.soldQty - last) / last) * 1000) / 10 : 0 };
  });

  res.json({
    period, revenue, cost, profit,
    profitMargin: revenue ? `${((profit / revenue) * 100).toFixed(1)}%` : "0.0%",
    revenueGrowthPct: prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null,
    trafficOrders: cur.length,
    dineInTraffic: cur.filter((o) => orderHas(o, ["dine_in", "takeaway"])).length,
    deliveryTraffic: cur.filter((o) => orderHas(o, ["delivery"])).length,
    avgOrderValue: cur.length ? money(revenue / cur.length) : 0,
    chartBars, bestSellers,
  });
});
