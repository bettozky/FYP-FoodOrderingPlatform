// Sprint 3 "diet and allergy profile": does a dish fit the customer? No React here, so the backend test runner can check it.

/** The 9 common allergens a stall can declare (same list as backend/src/lib/allergens.ts). */
export const ALLERGENS = ["Peanuts", "Tree nuts", "Shellfish", "Fish", "Egg", "Milk", "Gluten", "Soy", "Sesame"] as const;

export const DIET_PREFS = [
  { key: "vegetarian", label: "Vegetarian", hint: "No meat or seafood" },
  { key: "plant_based", label: "Plant-based", hint: "No meat, seafood, egg or milk" },
  { key: "no_spicy", label: "No spicy food", hint: "Flag dishes marked spicy" },
] as const;

export type DietProfile = { allergens: string[]; prefs: string[]; hideUnsuitable: boolean };
export const EMPTY_DIET: DietProfile = { allergens: [], prefs: [], hideUnsuitable: false };

type DishLike = { dietary?: string[]; allergens?: string[]; spicy?: boolean };
type ShopLike = { allergens?: string[] } | undefined;

/**
 * "avoid": the dish breaks the profile (an allergen it contains, or a diet it does not meet).
 * "check": the dish lists nothing, but the stall's kitchen uses one of your allergens, so ask first.
 * "ok":    nothing in the profile is against it (or there is no profile).
 */
export type DietFit = { level: "ok" | "check" | "avoid"; reasons: string[] };

/** How the reasons are worded. English by default; the app passes the chosen language (see dietWords.ts). */
export type DietWords = {
  contains: (allergens: string[]) => string;
  notPlantBased: string;
  notVegetarian: string;
  spicy: string;
  kitchenUses: (allergens: string[]) => string;
};
export const DIET_WORDS_EN: DietWords = {
  contains: (a) => `Contains ${a.join(", ")}`,
  notPlantBased: "Not plant-based",
  notVegetarian: "Not vegetarian",
  spicy: "Spicy",
  kitchenUses: (a) => `Kitchen uses ${a.join(", ")}`,
};

export function dietFit(dish: DishLike, shop: ShopLike, p: DietProfile | null | undefined, words: DietWords = DIET_WORDS_EN): DietFit {
  if (!p || (!p.allergens.length && !p.prefs.length)) return { level: "ok", reasons: [] };
  const reasons: string[] = [];
  const dietary = dish.dietary ?? [];
  const contains = (dish.allergens ?? []).filter((a) => p.allergens.includes(a));
  if (contains.length) reasons.push(words.contains(contains));
  if (p.prefs.includes("plant_based") && !dietary.includes("plant_based")) reasons.push(words.notPlantBased);
  else if (p.prefs.includes("vegetarian") && !dietary.includes("vegetarian") && !dietary.includes("plant_based")) reasons.push(words.notVegetarian);
  if (p.prefs.includes("no_spicy") && (dish.spicy || dietary.includes("spicy"))) reasons.push(words.spicy);
  if (reasons.length) return { level: "avoid", reasons };

  // The dish lists none of your allergens, but the kitchen uses some: worth asking the stall.
  if (!dish.allergens?.length) {
    const kitchen = (shop?.allergens ?? []).filter((a) => p.allergens.includes(a));
    if (kitchen.length) return { level: "check", reasons: [words.kitchenUses(kitchen)] };
  }
  return { level: "ok", reasons: [] };
}

/** "Peanuts, Milk · Vegetarian" for the Account row. */
export function dietSummary(p: DietProfile | null | undefined): string {
  if (!p || (!p.allergens.length && !p.prefs.length)) return "Not set";
  const prefs = DIET_PREFS.filter((d) => p.prefs.includes(d.key)).map((d) => d.label);
  return [...p.allergens, ...prefs].join(", ");
}
