// Fixed UI options (not data). Loyalty points, food categories and addresses used to live here as
// placeholders; they now come from real orders (modules/loyalty/useLoyalty.ts), real dishes
// (HomeScreen) and real shop locations (CatalogContext.addressesFromShops).
import i18n from "i18next";

// Dietary filters (FR-1.3). Each has an icon AND a text label so it never relies on colour alone (NFR-9).
// `label` is read in the app's current language each time (i18n getters).
export const DIETARY_FILTERS = [
  { key: "vegetarian", get label() { return i18n.t("diet.vegetarian"); }, icon: "leaf" },
  { key: "plant_based", get label() { return i18n.t("diet.plantBased"); }, icon: "flower" },
  { key: "spicy", get label() { return i18n.t("diet.spicy"); }, icon: "flame" },
  { key: "allergy_free", get label() { return i18n.t("diet.allergyFree"); }, icon: "shield-checkmark" },
] as const;
