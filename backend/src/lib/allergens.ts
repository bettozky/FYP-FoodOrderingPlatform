import type { Dish, Merchant } from "../store/types.js";

/** The 9 common allergens a shop can declare (same names as the merchant app's sign-up list). */
export const ALLERGENS = ["Peanuts", "Tree nuts", "Shellfish", "Fish", "Egg", "Milk", "Gluten", "Soy", "Sesame"] as const;

/** Keeps only known allergen names, without repeats, in the standard order. Anything that is not an array gives undefined. */
export function cleanAllergens(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const picked = new Set(v.map(String));
  return ALLERGENS.filter((a) => picked.has(a));
}

/**
 * What the shop told us is used in its kitchen: what it ticked at sign-up plus anything tagged on its dishes since.
 * undefined = the shop never answered (older shops); [] = the shop said none of the 9 are used.
 */
export function kitchenAllergens(m: Merchant, dishes: Iterable<Dish>): string[] | undefined {
  const found = new Set(m.allergens ?? []);
  for (const d of dishes) if (d.merchantId === m.id) for (const a of d.allergens ?? []) found.add(a);
  if (m.allergens === undefined && found.size === 0) return undefined;
  return ALLERGENS.filter((a) => found.has(a));
}
