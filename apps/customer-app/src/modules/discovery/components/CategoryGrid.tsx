import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, layout, radius, spacing } from "../../../shared/theme/theme";

// Category row on Home: one swipeable row of quiet icon tiles (venue types, Halal, live map, food types,
// shortcuts). Venues come from the stalls, food types from the dishes. A selected tile turns ink.
// (Premium pass, Nov 2026: replaces the two-row grid of multicolour cartoon icons.)
export type IconKind =
  | "trending" | "halal" | "buffet" | "luxury" | "cafe" | "rice" | "noodles" | "drinks" | "dessert"
  | "snacks" | "western" | "chicken" | "healthy" | "plate" | "map" | "book" | "jobs" | "saved";

export type GridItem = { key: string; label: string; kind: IconKind; hot?: boolean; badge?: string; selected?: boolean; onPress: () => void; hint?: string };

const ICONS: Record<IconKind, keyof typeof Ionicons.glyphMap> = {
  trending: "flame-outline",
  halal: "moon-outline",
  buffet: "restaurant-outline",
  luxury: "diamond-outline",
  cafe: "cafe-outline",
  rice: "nutrition-outline",
  noodles: "restaurant-outline",
  drinks: "water-outline",
  dessert: "ice-cream-outline",
  snacks: "fast-food-outline",
  western: "pizza-outline",
  chicken: "flame-outline",
  healthy: "leaf-outline",
  plate: "restaurant-outline",
  map: "map-outline",
  book: "calendar-outline",
  jobs: "briefcase-outline",
  saved: "heart-outline",
};

/** Picks an icon for a venue type or food type by name, with a plate-and-cutlery fallback for new ones. */
export function lookFor(label: string): { kind: IconKind } {
  const l = label.toLowerCase();
  if (l.includes("trend")) return { kind: "trending" };
  if (l.includes("halal") || l.includes("muslim")) return { kind: "halal" };
  if (l.includes("buffet")) return { kind: "buffet" };
  if (l.includes("luxury")) return { kind: "luxury" };
  if (l.includes("cafe") || l.includes("coffee")) return { kind: "cafe" };
  if (l.includes("rice")) return { kind: "rice" };
  if (l.includes("noodle") || l.includes("mee") || l.includes("pasta")) return { kind: "noodles" };
  if (l.includes("drink") || l.includes("beverage") || l.includes("tea") || l.includes("juice")) return { kind: "drinks" };
  if (l.includes("dessert") || l.includes("sweet") || l.includes("cake") || l.includes("ice")) return { kind: "dessert" };
  if (l.includes("snack") || l.includes("fries") || l.includes("side")) return { kind: "snacks" };
  if (l.includes("western") || l.includes("burger") || l.includes("sandwich")) return { kind: "western" };
  if (l.includes("chicken") || l.includes("fried") || l.includes("grill")) return { kind: "chicken" };
  if (l.includes("salad") || l.includes("healthy") || l.includes("vegetarian") || l.includes("plant")) return { kind: "healthy" };
  return { kind: "plate" };
}

export default function CategoryGrid({ items }: { items: GridItem[] }) {
  if (!items.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      accessibilityLabel="Categories. Swipe sideways for more."
      testID="category-scroll"
    >
      {items.map((it) => (
        <Tile key={it.key} item={it} />
      ))}
    </ScrollView>
  );
}

function Tile({ item }: { item: GridItem }) {
  const on = !!item.selected;
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={item.hint ?? item.label}
      accessibilityState={{ selected: on }}
      testID={`grid-${item.key}`}
    >
      <View style={[styles.tile, on && styles.tileOn]}>
        <Ionicons name={ICONS[item.kind]} size={24} color={on ? colors.white : colors.ink} />
        {item.badge ? <View style={styles.dot} accessibilityElementsHidden /> : null}
      </View>
      <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{item.label}</Text>
    </Pressable>
  );
}

const TILE = 60;

const styles = StyleSheet.create({
  scroll: { marginTop: spacing.xl, flexGrow: 0 },
  row: { paddingHorizontal: layout.gutter, gap: spacing.md },
  cell: { width: TILE + 8, alignItems: "center", gap: 6 },
  tile: { width: TILE, height: TILE, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, alignItems: "center", justifyContent: "center" },
  tileOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  dot: { position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.turmeric },
  label: { ...font.display, fontSize: 13, color: colors.ink, textAlign: "center" },
  labelOn: { ...font.displayBold },
});
