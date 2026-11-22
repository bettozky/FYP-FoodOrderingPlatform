// Translated names for fixed values the server sends in English (the server and the shops keep using English).
import i18n from "./index";

const ALLERGEN_KEY = {
  Peanuts: "allergen.peanuts",
  "Tree nuts": "allergen.treeNuts",
  Shellfish: "allergen.shellfish",
  Fish: "allergen.fish",
  Egg: "allergen.egg",
  Milk: "allergen.milk",
  Gluten: "allergen.gluten",
  Soy: "allergen.soy",
  Sesame: "allergen.sesame",
} as const;

/** One of the 9 common allergens in the app's language ("Peanuts" → "Kacang" / "花生"); unknown names stay as sent. */
export const allergenName = (a: string): string => (a in ALLERGEN_KEY ? i18n.t(ALLERGEN_KEY[a as keyof typeof ALLERGEN_KEY]) : a);

// Venue types are fixed by ScootMeal (shops pick one), so they are translated; anything else shows as written.
const VENUE_KEY = { Trending: "home.venueTrending", Buffet: "home.venueBuffet", Luxury: "home.venueLuxury", "Aesthetic Cafe": "home.venueCafe" } as const;
export const venueName = (v: string): string => (v in VENUE_KEY ? i18n.t(VENUE_KEY[v as keyof typeof VENUE_KEY]) : v);

// Loyalty tiers (modules/loyalty/points.ts keeps the English names).
const TIER_KEY = { Regular: "loyalty.regular", Silver: "loyalty.silver", Gold: "loyalty.gold" } as const;
export const tierName = (tier: string): string => (tier in TIER_KEY ? i18n.t(TIER_KEY[tier as keyof typeof TIER_KEY]) : tier);

/** "5 min ago" / "3 h ago" / "2 d ago". */
export const timeAgo = (ts: number): string => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 60) return i18n.t("common.minAgo", { n: Math.max(m, 1) });
  const h = Math.floor(m / 60);
  return h < 24 ? i18n.t("common.hAgo", { n: h }) : i18n.t("common.dAgo", { n: Math.floor(h / 24) });
};

/** "Peanuts, Soy" in the app's language. */
export const allergenList = (list: string[]): string => list.map(allergenName).join(i18n.t("common.listSep"));
