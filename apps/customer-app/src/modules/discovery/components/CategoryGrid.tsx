import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors, fonts, radius, spacing } from "../../../shared/theme/theme";
import { useReducedMotion } from "../../../shared/motion/useReducedMotion";
import CuteIcon, { type IconKind } from "./CuteIcons";
import Flame from "./Flame";

// Category panel on Home: cute flat food icons in two rows that you swipe sideways (the next column peeks in from the
// right so people know there is more). Venues come from the stalls, food types from the dishes, plus shortcuts.
// "hot" puts the flickering flame on an icon (Trending), "badge" adds a small orange tag (NEW on Halal).
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

const CELL = 72;
const GAP = 6;
const PAD = 14;

export default function CategoryGrid({ items }: { items: GridItem[] }) {
  const [atEnd, setAtEnd] = useState(false);
  const columns = useMemo(() => {
    const out: GridItem[][] = [];
    for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
    return out;
  }, [items]);
  if (!items.length) return null;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setAtEnd(contentOffset.x + layoutMeasurement.width >= contentSize.width - 8);
  };
  return (
    <View style={styles.wrap} accessibilityLabel="Categories. Swipe sideways for more.">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CELL + GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={32}
        onScroll={onScroll}
        contentContainerStyle={styles.scroll}
        testID="category-scroll"
      >
        {columns.map((col, c) => (
          <View key={c} style={styles.column}>
            {col.map((it, r) => (
              <Tile key={it.key} item={it} index={c * 2 + r} />
            ))}
          </View>
        ))}
      </ScrollView>
      {!atEnd ? (
        <View pointerEvents="none" style={styles.fade}>
          <Svg width={34} height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="catFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="0.85" stopColor="#FFFFFF" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="34" height="100%" fill="url(#catFade)" />
          </Svg>
          <Ionicons name="chevron-forward" size={14} color={colors.stone} style={{ marginRight: 6 }} />
        </View>
      ) : null}
    </View>
  );
}

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
      style={({ pressed }) => [styles.cell, pressed && { transform: [{ scale: 0.92 }] }]}
      accessibilityRole="button"
      accessibilityLabel={item.hint ?? item.label}
      accessibilityState={{ selected: !!item.selected }}
      testID={`grid-${item.key}`}
    >
      {item.hot ? <Flame /> : null}
      {item.kind === "luxury" ? <Twinkle /> : null}
      {item.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      ) : null}
      <Animated.View style={[styles.iconWrap, item.selected && styles.iconOn, { transform: [{ translateY }, { rotate }] }]}>
        <CuteIcon kind={item.kind} size={56} />
      </Animated.View>
      <Text style={[styles.label, item.selected && styles.labelOn]} numberOfLines={1}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: colors.paper, borderRadius: radius.lg, overflow: "hidden" },
  scroll: { paddingLeft: PAD, paddingRight: PAD, paddingTop: 40, paddingBottom: 18, flexDirection: "row", gap: GAP },
  column: { width: CELL, gap: 18 },
  cell: { width: CELL, alignItems: "center", gap: 6 },
  iconWrap: { width: 60, height: 60, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  iconOn: { backgroundColor: colors.amberTint, borderWidth: 2, borderColor: colors.ink },
  label: { fontFamily: fonts.display, fontSize: 12, color: colors.ink, textAlign: "center" },
  labelOn: { fontFamily: fonts.displayBold },
  badge: { position: "absolute", top: -6, right: 4, zIndex: 4, backgroundColor: "#FF6A33", paddingHorizontal: 6, paddingVertical: 2, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomRightRadius: 8, borderBottomLeftRadius: 2 },
  badgeText: { fontFamily: fonts.displayExtraBold, fontSize: 9, letterSpacing: 0.4, color: colors.white },
  twinkle: { position: "absolute", right: 2, top: -4, zIndex: 3 },
  fade: { position: "absolute", right: 0, top: 0, bottom: 0, width: 34, alignItems: "flex-end", justifyContent: "center" },
});
