import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { cleanAllergens } from "../../lib/allergens.js";
import { auth, currentUser } from "../../middleware/auth.js";
import type { DietProfile } from "../../store/types.js";

// Sprint 3 "diet and allergy profile": the customer saves their allergies and diet once, and the app flags or hides
// dishes that do not fit. Matching happens in the app (apps/customer-app/src/modules/diet/diet.ts) because the
// dish and shop allergen lists are already there.
export const DIET_PREFS = ["vegetarian", "plant_based", "no_spicy"] as const;

export const dietRouter = Router();
dietRouter.use(auth("customer"));

const EMPTY: DietProfile = { allergens: [], prefs: [], hideUnsuitable: false };

dietRouter.get("/", (_req, res) => {
  res.json({ diet: currentUser(res).diet ?? EMPTY });
});

dietRouter.put("/", (req, res) => {
  const b = req.body ?? {};
  const allergens = cleanAllergens(b.allergens);
  if (!allergens) throw new HttpError(400, "allergens must be a list");
  if (!Array.isArray(b.prefs)) throw new HttpError(400, "prefs must be a list");
  const picked = new Set(b.prefs.map(String));
  const prefs = DIET_PREFS.filter((p) => picked.has(p));
  const u = currentUser(res);
  u.diet = { allergens, prefs: [...prefs], hideUnsuitable: b.hideUnsuitable === true };
  res.json({ diet: u.diet });
});
