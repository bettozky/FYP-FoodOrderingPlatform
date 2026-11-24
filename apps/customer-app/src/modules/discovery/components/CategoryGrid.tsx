import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, font, layout, radius, spacing } from "../../../shared/theme/theme";
import { useReducedMotion } from "../../../shared/motion/useReducedMotion";
import CuteIcon, { type IconKind } from "./CuteIcons";
import Flame from "./Flame";
import i18n from "../../../shared/i18n";

// Category row on Home: the cute multicolour food icons in one swipeable row of white tiles (venue types, Halal,
// live map, food types, shortcuts). Venues come from the stalls, food types from the dishes, plus shortcuts.
// "hot" puts the flickering flame on an icon (Trending), "badge" adds a small orange tag (NEW on Halal).
// The icons bob gently; reduced-motion users get them standing still. A selected tile turns amber with an ink ring.
export type { IconKind };
export type GridItem = { key: string; label: string; kind: IconKind; hot?: boolean; badge?: string; selected?: boolean; onPress: () => void; hint?: string };

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
      decelerationRate="fast"
      snapToInterval={CELL + spacing.md}
      snapToAlignment="start"
      accessibilityLabel={i18n.t("home.categoriesLabel")}
      testID="category-scroll"
    >
      {items.map((it, i) => (
        <Tile key={it.key} item={it} index={i} />
      ))}
    </ScrollView>
  );
}

/** The small four-point sparkle that twinkles on the Luxury icon. */
function Twinkle() {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, v]);
  const opacity = reduced ? 1 : v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const scale = reduced ? 1 : v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] });
  return (
    <Animated.View pointerEvents="none" style={[styles.twinkle, { opacity, transform: [{ scale }] }]}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path d="M12 1l2.600 8.400L23 12l-8.400 2.600L12 23l-2.600-8.400L1 12l8.400-2.600z" fill="#FFC93C" />
      </Svg>
    </Animated.View>
  );
}

function Tile({ item, index }: { item: GridItem; index: number }) {
  const reduced = useReducedMotion();
  const on = !!item.selected;
  // Each icon bobs a little, out of step with its neighbours.
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay((index * 300) % 4500),
        Animated.timing(bob, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, index, bob]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-2deg"] });

  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [styles.cell, pressed && { transform: [{ scale: 0.94 }] }]}
      accessibilityRole="button"
      accessibilityLabel={item.hint ?? item.label}
      accessibilityState={{ selected: on }}
      testID={`grid-${item.key}`}
    >
      <View style={[styles.tile, on && styles.tileOn]}>
        {item.hot ? <Flame /> : null}
        {item.kind === "luxury" ? <Twinkle /> : null}
        <Animated.View style={{ transform: [{ translateY }, { rotate }] }}>
          <CuteIcon kind={item.kind} size={46} />
        </Animated.View>
        {item.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{item.label}</Text>
    </Pressable>
  );
}

const CELL = 72;
const TILE = 64;

const styles = StyleSheet.create({
  scroll: { marginTop: spacing.md, flexGrow: 0 },
  // Top padding leaves room for the Trending flame, which rises above its tile.
  row: { paddingHorizontal: layout.gutter, paddingTop: 28, paddingBottom: spacing.xs, gap: spacing.md },
  cell: { width: CELL, alignItems: "center", gap: 6 },
  tile: { width: TILE, height: TILE, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, alignItems: "center", justifyContent: "center" },
  tileOn: { backgroundColor: colors.amberTint, borderColor: colors.ink, borderWidth: 2 },
  label: { ...font.display, fontSize: 13, color: colors.ink, textAlign: "center" },
  labelOn: { ...font.displayBold },
  badge: { position: "absolute", top: -7, right: -6, zIndex: 4, backgroundColor: "#FF6A33", paddingHorizontal: 6, paddingVertical: 2, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomRightRadius: 8, borderBottomLeftRadius: 2 },
  badgeText: { ...font.displayExtraBold, fontSize: 11, letterSpacing: 0.3, color: colors.white },
  twinkle: { position: "absolute", right: 4, top: 2, zIndex: 3 },
});
