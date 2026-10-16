// Loyalty points are still a placeholder until the Promotions module tracks them (FR-2.9).
export const loyalty = {
  points: 320,
  tier: "Regular",
  nextTierAt: 500,
};

export const categories = ["All", "Noodles", "Rice", "Drinks"];

// Dietary filters (FR-1.3). Each has an icon AND a text label so it never relies on colour alone (NFR-9).
export const DIETARY_FILTERS = [
  { key: "vegetarian", label: "Vegetarian", icon: "leaf" },
  { key: "plant_based", label: "Plant-based", icon: "flower" },
  { key: "spicy", label: "Spicy", icon: "flame" },
  { key: "allergy_free", label: "Allergy-free", icon: "shield-checkmark" },
] as const;

export const ADDRESS_PRESETS = [
  { label: "Canteen A", line: "Canteen A, Swinburne Sarawak", lat: 1.5533, lng: 110.3592 },
  { label: "Student Residence", line: "Block D, Student Residence", lat: 1.556, lng: 110.362 },
  { label: "Library", line: "Library, Swinburne Sarawak", lat: 1.5548, lng: 110.3605 },
  { label: "Faculty Building", line: "Faculty Building, Swinburne Sarawak", lat: 1.5521, lng: 110.3571 },
];
