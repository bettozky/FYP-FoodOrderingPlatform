// The diet reasons ("Contains Peanuts", "Kitchen uses Soy") in the app's language. diet.ts stays free of React and
// i18n so the backend test runner can check it; the screens pass dietWords() to dietFit().
import i18n from "../../shared/i18n";
import { allergenList } from "../../shared/i18n/labels";
import type { DietWords } from "./diet";

export const dietWords = (): DietWords => ({
  contains: (a) => i18n.t("diet.contains", { list: allergenList(a) }),
  notPlantBased: i18n.t("diet.notPlantBased"),
  notVegetarian: i18n.t("diet.notVegetarian"),
  spicy: i18n.t("diet.spicy"),
  kitchenUses: (a) => i18n.t("diet.kitchenUses", { list: allergenList(a) }),
});

/** Name and one-line hint for each diet preference (diet.ts keeps the English for the tests). */
export const prefText = (key: string): { label: string; hint: string } =>
  key === "vegetarian"
    ? { label: i18n.t("diet.vegetarian"), hint: i18n.t("diet.vegetarianHint") }
    : key === "plant_based"
      ? { label: i18n.t("diet.plantBased"), hint: i18n.t("diet.plantBasedHint") }
      : { label: i18n.t("diet.noSpicy"), hint: i18n.t("diet.noSpicyHint") };
