import { Router } from "express";
import { db } from "../../store/db.js";
import type { Dish } from "../../store/types.js";
import { HttpError } from "../../lib/http.js";
import { averageOf, isVisible } from "../../lib/ratings.js";
import { breakdownOf, publicReview } from "../../lib/reviewView.js";
import { optionalUser } from "../../middleware/auth.js";
import { merchantView, origin } from "./merchants.view.js";

/** Public catalog used by the customer app (browse, search, filter - FR-1.3 to FR-1.6). */
export const catalogRouter = Router();

/** What a customer may see of a dish: never the ingredient cost or the stock count (those are for the merchant). */
export function publicDish(d: Dish, favourite?: Set<string>) {
  const { cost: _cost, stock: _stock, ...rest } = d;
  return favourite ? { ...rest, isFavourite: favourite.has(d.id) } : rest;
}

const favouriteDishes = (userId?: string) => (userId ? new Set(db.favourites.get(userId)?.dishes ?? []) : undefined);

// ---- shops ----
// ?lat&lng (distance from there) &q (name or cuisine) &openNow=true &cuisine= &venueCategory= &sort=distance|rating|name
catalogRouter.get("/merchants", optionalUser, (req, res) => {
  const from = origin(req.query);
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const cuisine = String(req.query.cuisine ?? "").trim().toLowerCase();
  const venue = String(req.query.venueCategory ?? "");
  const favs = res.locals.user ? new Set(db.favourites.get(res.locals.user.id)?.merchants ?? []) : undefined;
  let list = [...db.merchants.values()]
    .filter((m) => m.approval === "approved")
    .map((m) => ({ ...merchantView(m, from), ...(favs ? { isFavourite: favs.has(m.id) } : {}) }))
    .filter((m) => !q || `${m.name} ${m.tags.join(" ")}`.toLowerCase().includes(q))
    .filter((m) => !cuisine || m.tags.some((t) => t.toLowerCase() === cuisine))
    .filter((m) => !venue || m.venueCategory === venue)
    .filter((m) => req.query.openNow !== "true" || m.openNow);
  const sort = String(req.query.sort ?? "");
  if (sort === "distance") list = list.sort((a, b) => a.distanceKm - b.distanceKm);
  else if (sort === "rating") list = list.sort((a, b) => b.rating - a.rating);
  else if (sort === "name") list = list.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ serverNow: Date.now(), merchants: list });
});

// One shop page: the shop, its menu grouped by category, its rating and latest reviews, and its vouchers.
catalogRouter.get("/merchants/:id", optionalUser, (req, res) => {
  const m = db.merchants.get(req.params.id as string);
  if (!m || m.approval !== "approved") throw new HttpError(404, "Shop not found");
  const favs = favouriteDishes(res.locals.user?.id);
  const dishes = [...db.dishes.values()].filter((d) => d.merchantId === m.id).map((d) => publicDish(d, favs));
  const menu = new Map<string, typeof dishes>();
  for (const d of dishes) menu.set(d.category, [...(menu.get(d.category) ?? []), d]);
  const reviews = db.reviews
    .filter((r) => isVisible(r) && db.dishes.get(r.dishId)?.merchantId === m.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    serverNow: Date.now(),
    merchant: merchantView(m, origin(req.query)),
    menu: [...menu].map(([category, items]) => ({ category, dishes: items })),
    dishes,
    reviewSummary: { average: averageOf(reviews.map((r) => r.rating)), count: reviews.length, breakdown: breakdownOf(reviews) },
    reviews: reviews.slice(0, 10).map(publicReview),
    vouchers: db.vouchers.filter((v) => v.active && (!v.merchantId || v.merchantId === m.id) && (!v.expiryDate || v.expiryDate >= today)),
  });
});

catalogRouter.get("/merchants/:id/reviews", (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const all = db.reviews.filter((r) => isVisible(r) && db.dishes.get(r.dishId)?.merchantId === req.params.id).sort((a, b) => b.createdAt - a.createdAt);
  const dishId = String(req.query.dishId ?? "");
  const shown = dishId ? all.filter((r) => r.dishId === dishId) : all;
  res.json({ average: averageOf(all.map((r) => r.rating)), count: all.length, breakdown: breakdownOf(all), total: shown.length, reviews: shown.slice(offset, offset + limit).map(publicReview) });
});

// ---- dishes ----
// ?q &merchantId &dietary=a,b &style=dry|wet &category= &minPrice &maxPrice &available=true &openNow=true
// &sort=price_asc|price_desc|rating|popular &limit
catalogRouter.get("/dishes", optionalUser, (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const diet = String(req.query.dietary ?? "").split(",").filter(Boolean);
  const style = String(req.query.style ?? "");
  const merchantId = String(req.query.merchantId ?? "");
  const category = String(req.query.category ?? "");
  const min = req.query.minPrice === undefined ? -Infinity : Number(req.query.minPrice);
  const max = req.query.maxPrice === undefined ? Infinity : Number(req.query.maxPrice);
  const favs = favouriteDishes(res.locals.user?.id);
  let out = [...db.dishes.values()].filter((d) => {
    const m = db.merchants.get(d.merchantId);
    if (!m || m.approval !== "approved") return false;
    if (merchantId && d.merchantId !== merchantId) return false;
    if (q && !`${d.name} ${d.description} ${d.category} ${m.name}`.toLowerCase().includes(q)) return false;
    if (diet.length && !diet.every((t) => d.dietary.includes(t))) return false;
    if (style && d.style !== style) return false;
    if (category && d.category !== category) return false;
    if (d.price < min || d.price > max) return false;
    if (req.query.available === "true" && d.soldOut) return false;
    if (req.query.openNow === "true" && !merchantView(m).openNow) return false;
    return true;
  });
  const sort = String(req.query.sort ?? "");
  if (sort === "price_asc") out = out.sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") out = out.sort((a, b) => b.price - a.price);
  else if (sort === "popular") {
    const sold = new Map<string, number>();
    for (const o of db.orders.values()) for (const i of o.items) sold.set(i.dishId, (sold.get(i.dishId) ?? 0) + i.qty);
    out = out.sort((a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0));
  } else if (sort === "rating") {
    const rating = (id: string) => averageOf(db.reviews.filter((r) => r.dishId === id && isVisible(r)).map((r) => r.rating)) ?? 0;
    out = out.sort((a, b) => rating(b.id) - rating(a.id));
  }
  const limit = Number(req.query.limit);
  if (Number.isInteger(limit) && limit > 0) out = out.slice(0, limit);
  res.json({ dishes: out.map((d) => publicDish(d, favs)) });
});

catalogRouter.get("/dishes/:id", optionalUser, (req, res) => {
  const d = db.dishes.get(req.params.id as string);
  const m = d && db.merchants.get(d.merchantId);
  if (!d || !m || m.approval !== "approved") throw new HttpError(404, "Dish not found");
  res.json({ dish: publicDish(d, favouriteDishes(res.locals.user?.id)), merchant: merchantView(m, origin(req.query)) });
});

catalogRouter.get("/dishes/:id/reviews", (req, res) => {
  const reviews = db.reviews.filter((r) => r.dishId === req.params.id && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ average: averageOf(reviews.map((r) => r.rating)), count: reviews.length, breakdown: breakdownOf(reviews), reviews: reviews.map(publicReview) });
});

catalogRouter.get("/categories", (_req, res) => {
  const counts = new Map<string, number>();
  for (const d of db.dishes.values()) if (db.merchants.get(d.merchantId)?.approval === "approved") counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  res.json({ categories: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) });
});

// Shops and dishes in one call (for a single search box).
catalogRouter.get("/search", (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  if (!q) return res.json({ merchants: [], dishes: [] });
  const merchants = [...db.merchants.values()]
    .filter((m) => m.approval === "approved" && `${m.name} ${m.tags.join(" ")}`.toLowerCase().includes(q))
    .map((m) => merchantView(m, origin(req.query)));
  const dishes = [...db.dishes.values()]
    .filter((d) => db.merchants.get(d.merchantId)?.approval === "approved" && `${d.name} ${d.description} ${d.category}`.toLowerCase().includes(q))
    .slice(0, 30)
    .map((d) => publicDish(d));
  res.json({ merchants, dishes });
});

// ---- the rest of the public lists ----
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

// ?q= (title, role or shop)  ?type=Part-time|Full-time|...  ; signed-in customers also get `applied` on each vacancy.
catalogRouter.get("/jobs", optionalUser, (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const type = String(req.query.type ?? "").trim().toLowerCase();
  const applied = new Set(res.locals.user ? [...db.applications.values()].filter((a) => a.userId === res.locals.user.id && a.status !== "withdrawn").map((a) => a.jobId) : []);
  const jobs = [...db.jobs.values()]
    .filter((j) => j.open && db.merchants.get(j.merchantId)?.approval === "approved")
    .filter((j) => !q || `${j.title} ${j.role ?? ""} ${j.merchantName}`.toLowerCase().includes(q))
    .filter((j) => !type || j.type.toLowerCase() === type)
    .sort((a, b) => b.postedAt - a.postedAt)
    .map(({ applicants: _n, ...j }) => ({ ...j, ...(res.locals.user ? { applied: applied.has(j.id) } : {}) }));
  res.json({ jobs });
});
