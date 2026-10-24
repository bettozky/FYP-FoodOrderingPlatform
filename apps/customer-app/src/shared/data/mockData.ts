// Fixed UI options (not data). Loyalty points, food categories and addresses used to live here as
// placeholders; they now come from real orders (modules/loyalty/useLoyalty.ts), real dishes
// (HomeScreen) and real shop locations (CatalogContext.addressesFromShops).

// Dietary filters (FR-1.3). Each has an icon AND a text label so it never relies on colour alone (NFR-9).
export const DIETARY_FILTERS = [
  { key: "vegetarian", label: "Vegetarian", icon: "leaf" },
  { key: "plant_based", label: "Plant-based", icon: "flower" },
  { key: "spicy", label: "Spicy", icon: "flame" },
  { key: "allergy_free", label: "Allergy-free", icon: "shield-checkmark" },
] as const;
