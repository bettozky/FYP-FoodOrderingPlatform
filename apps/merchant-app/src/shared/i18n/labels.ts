// Translated names for fixed values the server keeps in English (same as the customer app's labels.ts).
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

/** One of the 9 common allergens in the app's language ("Peanuts" → "Kacang tanah" / "花生"); unknown names stay as sent. */
export const allergenName = (a: string): string => (a in ALLERGEN_KEY ? i18n.t(ALLERGEN_KEY[a as keyof typeof ALLERGEN_KEY]) : a);

/** "Peanuts, Soy" in the app's language. */
export const allergenList = (list: string[]): string => list.map(allergenName).join(i18n.t("common.listSep"));
