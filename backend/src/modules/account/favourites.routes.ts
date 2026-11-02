import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Favourites } from "../../store/types.js";
import { publicDish } from "../merchants/catalog.routes.js";
import { merchantView } from "../merchants/merchants.view.js";

/** Saved ("favourite") dishes and shops of the signed-in customer. */
export const favouritesRouter = Router();
favouritesRouter.use(auth("customer"));

function mine(userId: string): Favourites {
  let f = db.favourites.get(userId);
  if (!f) { f = { userId, dishes: [], merchants: [] }; db.favourites.set(userId, f); }
  return f;
}

favouritesRouter.get("/", (_req, res) => {
  const f = db.favourites.get(currentUser(res).id) ?? { dishes: [], merchants: [] };
  res.json({
    dishes: f.dishes.map((id) => db.dishes.get(id)).filter((d) => d && db.merchants.get(d.merchantId)?.approval === "approved").map((d) => publicDish(d!)),
    merchants: f.merchants.map((id) => db.merchants.get(id)).filter((m) => m?.approval === "approved").map((m) => merchantView(m!)),
    dishIds: f.dishes, merchantIds: f.merchants,
  });
});

for (const [kind, store, list] of [["dishes", db.dishes, "dishes"], ["merchants", db.merchants, "merchants"]] as const) {
  favouritesRouter.put(`/${kind}/:id`, (req, res) => {
    const id = req.params.id as string;
    if (!store.has(id)) throw new HttpError(404, kind === "dishes" ? "Dish not found" : "Shop not found");
    const f = mine(currentUser(res).id);
    if (!f[list].includes(id)) f[list].push(id);
    res.json({ ok: true });
  });
  favouritesRouter.delete(`/${kind}/:id`, (req, res) => {
    const f = mine(currentUser(res).id);
    f[list] = f[list].filter((x) => x !== req.params.id);
    res.json({ ok: true });
  });
}
