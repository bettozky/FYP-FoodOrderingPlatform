import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../../../shared/theme/theme";

// Colourful round icon grid on Home (task 2), in the style of the Meituan reference photos:
// a top row of big glossy icons (venue types + the live map) and a second row of smaller ones
// (food types + shortcuts). Built from data: venues come from the stalls, food types from the dishes.
type Icon = keyof typeof Ionicons.glyphMap;
export type GridItem = { key: string; label: string; icon: Icon; color: string; top: string; selected?: boolean; onPress: () => void };

const C = colors as Record<string, string>;
const pair = (name: string) => ({ color: C[`icon${name}`], top: C[`icon${name}Top`] });

/** Picks an icon and colour for a venue type or food type by name, with a fallback for new ones. */
export function lookFor(label: string): { icon: Icon } & ReturnType<typeof pair> {
  const l = label.toLowerCase();
  if (l.includes("trend")) return { icon: "flame", ...pair("Red") };
  if (l.includes("buffet")) return { icon: "restaurant", ...pair("Orange") };
  if (l.includes("luxury")) return { icon: "diamond", ...pair("Purple") };
  if (l.includes("cafe") || l.includes("coffee")) return { icon: "cafe", ...pair("Brown") };
  if (l.includes("rice")) return { icon: "nutrition", ...pair("Green") };
  if (l.includes("noodle")) return { icon: "fast-food", ...pair("Orange") };
  if (l.includes("drink") || l.includes("beverage")) return { icon: "water", ...pair("Blue") };
  if (l.includes("dessert") || l.includes("sweet")) return { icon: "ice-cream", ...pair("Pink") };
  if (l.includes("snack")) return { icon: "pizza", ...pair("Red") };
  return { icon: "restaurant-outline", ...pair("Teal") };
}

export default function CategoryGrid({ big, small }: { big: GridItem[]; small: GridItem[] }) {
  if (!big.length && !small.length) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Categories">
      <View style={styles.row}>
        {big.map((it, i) => (
          <Tile key={it.key} item={it} size={52} index={i} />
        ))}
      </View>
      {small.length ? (
        <View style={[styles.row, { marginTop: spacing.md }]}>
          {small.map((it, i) => (
            <Tile key={it.key} item={it} size={38} index={big.length + i} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Tile({ item, size }: { item: GridItem; size: number; index: number }) {
  return (
    <View style={styles.cell}>
      <Pressable
        onPress={item.onPress}
        style={({ pressed }) => [styles.press, pressed && { transform: [{ scale: 0.92 }] }]}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: !!item.selected }}
        testID={`grid-${item.key}`}
      >
        <View style={[styles.icon, { width: size, height: size, borderRadius: size * 0.34, backgroundColor: item.color }, item.selected && styles.iconOn]}>
          {/* Glossy top half, like the reference icons. */}
          <View style={[styles.gloss, { height: size * 0.5, borderTopLeftRadius: size * 0.34, borderTopRightRadius: size * 0.34, backgroundColor: item.top }]} />
          <Ionicons name={item.icon} size={size * 0.52} color={colors.white} />
        </View>
        <Text style={[styles.label, item.selected && styles.labelOn]} numberOfLines={1}>{item.label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, marginTop: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, backgroundColor: colors.paper, borderRadius: radius.lg },
  row: { flexDirection: "row", justifyContent: "space-between" },
  cell: { width: "20%", alignItems: "center" },
  press: { alignItems: "center", gap: 6, paddingHorizontal: 2 },
  icon: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  iconOn: { borderWidth: 3, borderColor: colors.ink },
  gloss: { position: "absolute", top: 0, left: 0, right: 0, opacity: 0.55 },
  label: { fontFamily: fonts.display, fontSize: 11.5, color: colors.ink, textAlign: "center" },
  labelOn: { fontFamily: fonts.displayBold },
});
