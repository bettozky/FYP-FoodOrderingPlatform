import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dish, Merchant } from "../../../shared/api/types";
import { colors, spacing, ui, font } from "../../../shared/theme/theme";
import DishImage, { softTint } from "../../../shared/components/DishImage";
import { readyText } from "./ReadyChip";
import { useFavourites } from "../../favourites/FavouritesContext";
import PressableScale from "../../../shared/motion/PressableScale";
import { dietFit } from "../../diet/diet";
import { useDiet } from "../../diet/useDiet";

// One dish, in the two layouts from Badrul's mock-up (Oct 2026):
//  - "grid": tile for "Popular near you" on Home: picture with the stall's rating on top,
//            name, "stall · prep time", price and the amber "+".
//  - "row":  stall menu row: picture on the left, name, short description, price, "+" on the right.
// Tapping the card opens the dish; "+" adds one (the mode is picked later in the cart).
type Props = {
  dish: Dish;
  merchant?: Merchant;
  onPress: () => void;
  /** Return false (e.g. the user kept their old cart) to skip the "added" tick. */
  onAdd?: () => unknown;
  variant?: "grid" | "row";
  /** Show the stall name and distance (off on the stall's own menu). */
  showMerchant?: boolean;
  /** Small heart to save the dish (used on the Saved dishes screen; not in the mock-up's cards). */
  showSave?: boolean;
  /** Fixed width for horizontal rows; grids leave it out and stretch. */
  width?: number;
};

export default function DishCard({ dish, merchant, onPress, onAdd, variant = "row", showMerchant = true, showSave = false, width }: Props) {
  const { isFav, toggle } = useFavourites();
  const fav = isFav(dish.id);
  const [justAdded, setJustAdded] = useState(false);
  const closed = !!merchant && !merchant.openNow;
  const unavailable = dish.soldOut || closed;
  const overlay = dish.soldOut ? "Sold out" : closed ? "Closed" : undefined;
  const btnScale = useRef(new Animated.Value(1)).current;
  const tint = softTint(merchant?.color);
  // Sprint 3 diet profile: red "Contains Peanuts", or amber "Kitchen uses ..." (ask the stall first).
  const { diet } = useDiet();
  const fit = dietFit(dish, merchant, diet);
  const dietFlag =
    fit.level !== "ok" ? (
      <View style={[styles.flag, fit.level === "avoid" ? styles.flagAvoid : styles.flagCheck]} testID={`diet-flag-${dish.id}`}>
        <Ionicons name={fit.level === "avoid" ? "warning" : "help-circle"} size={12} color={fit.level === "avoid" ? colors.chiliText : colors.amberText} />
        <Text style={[styles.flagText, { color: fit.level === "avoid" ? colors.chiliText : colors.amberText }]} numberOfLines={1}>
          {fit.reasons.join(" · ")}
        </Text>
      </View>
    ) : null;

  async function handleAdd() {
    const ok = await onAdd?.();
    if (ok === false) return;
    setJustAdded(true);
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.25, speed: 50, bounciness: 16, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, speed: 30, bounciness: 8, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setJustAdded(false), 800);
  }

  const addButton =
    !unavailable && onAdd ? (
      <Animated.View style={{ transform: [{ scale: btnScale }] }}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            handleAdd();
          }}
          hitSlop={10}
          style={[ui.addButton, justAdded && { backgroundColor: colors.herb }]}
          accessibilityRole="button"
          accessibilityLabel={`Add ${dish.name} to cart`}
          testID={`add-${dish.id}`}
        >
          <Ionicons name={justAdded ? "checkmark" : "add"} size={20} color={justAdded ? colors.white : colors.ink} />
        </Pressable>
      </Animated.View>
    ) : null;

  const heart = showSave ? (
    <Pressable
      hitSlop={10}
      onPress={(e) => {
        e.stopPropagation?.();
        toggle(dish.id);
      }}
      style={variant === "grid" ? styles.heartGrid : styles.heartRow}
      accessibilityRole="button"
      accessibilityLabel={fav ? `Remove ${dish.name} from saved dishes` : `Save ${dish.name}`}
    >
      <Ionicons name={fav ? "heart" : "heart-outline"} size={14} color={fav ? colors.chili : colors.stone} />
    </Pressable>
  ) : null;

  const label = `${dish.name}, RM ${dish.price.toFixed(2)}${merchant && showMerchant ? `, from ${merchant.name}` : ""}${overlay ? `, ${overlay}` : ""}${fit.reasons.length ? `. Diet warning: ${fit.reasons.join(", ")}` : ""}`;

  if (variant === "grid") {
    return (
      <PressableScale scaleTo={0.97} onPress={onPress} style={[styles.gridCard, width ? { width } : { flex: 1 }]} accessibilityRole="button" accessibilityLabel={label} testID={`dish-${dish.id}`}>
        <View style={styles.gridImageWrap}>
          <DishImage image={dish.image} size={120} tint={tint} overlay={overlay} style={styles.gridImage} />
          {merchant ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={11} color={colors.turmericDeep} />
              <Text style={styles.ratingText}>{merchant.rating.toFixed(1)}</Text>
            </View>
          ) : null}
          {heart}
          {dish.dealPercent ? (
            <View style={styles.dealBadge} testID={`deal-badge-${dish.id}`}>
              <Text style={styles.dealBadgeText}>-{dish.dealPercent}%</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.gridInfo}>
          <Text style={styles.name} numberOfLines={2}>{dish.name}</Text>
          {dietFlag}
          {merchant && showMerchant ? (
            <Text style={styles.meta} numberOfLines={2}>{merchant.name} · {readyText(merchant).toLowerCase()}</Text>
          ) : null}
          <View style={styles.bottom}>
            <Price dish={dish} />
            {addButton}
          </View>
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} style={styles.rowCard} accessibilityRole="button" accessibilityLabel={label} testID={`dish-${dish.id}`}>
      <DishImage image={dish.image} size={84} tint={tint} overlay={overlay} />
      <View style={styles.rowInfo}>
        <Text style={styles.name} numberOfLines={2}>{dish.name}</Text>
        {dish.description ? <Text style={styles.desc} numberOfLines={2}>{dish.description}</Text> : null}
        {dietFlag}
        {merchant && showMerchant ? (
          <Text style={styles.meta} numberOfLines={1}>
            {merchant.name} · {merchant.openNow ? `${merchant.distanceKm} km` : `opens ${merchant.hours.open}`}
          </Text>
        ) : null}
        <View style={{ marginTop: 2 }}><Price dish={dish} /></View>
      </View>
      <View style={styles.rowSide}>
        {heart}
        {addButton}
      </View>
    </PressableScale>
  );
}

/** The price, or during a last-hour deal the deal price in red with the normal price crossed out (Sprint 3). */
export function Price({ dish, large }: { dish: Dish; large?: boolean }) {
  const base = large ? ui.priceLarge : ui.price;
  if (!dish.originalPrice) return <Text style={base}>RM {dish.price.toFixed(2)}</Text>;
  return (
    <View style={[styles.priceRow, large && { justifyContent: "center" }]} accessibilityLabel={`RM ${dish.price.toFixed(2)}, was RM ${dish.originalPrice.toFixed(2)}`}>
      <Text style={[base, { color: colors.chiliText }]}>RM {dish.price.toFixed(2)}</Text>
      <Text style={[styles.was, large && { fontSize: 15 }]}>RM {dish.originalPrice.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Grid tile: photo bleeds to the card edge on top, text below. No shadow; the hairline border does the work.
  gridCard: { ...ui.card, overflow: "hidden" },
  gridImageWrap: { position: "relative" },
  gridImage: { width: "100%", height: undefined, aspectRatio: 4 / 3, borderRadius: 0 },
  rating: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { ...font.displayBold, fontSize: 12, color: colors.ink, fontVariant: ["tabular-nums"] },
  heartGrid: { ...ui.iconButton, position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16 },
  gridInfo: { padding: spacing.md, paddingTop: 10, gap: 3, flex: 1 },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: spacing.sm },

  rowCard: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.md },
  rowInfo: { flex: 1, minWidth: 0, gap: 3 },
  rowSide: { alignItems: "center", justifyContent: "center", gap: spacing.sm },
  heartRow: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  // Sprint 3 last-hour deals
  dealBadge: { position: "absolute", left: 8, bottom: 8, backgroundColor: colors.chili, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  dealBadgeText: { ...font.displayExtraBold, fontSize: 12, color: colors.white },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
  was: { ...font.display, fontSize: 13, color: colors.stoneText, textDecorationLine: "line-through" },

  name: { ...font.displayBold, fontSize: 16, lineHeight: 21, color: colors.ink, letterSpacing: -0.1 },
  desc: { ...font.serif, fontSize: 14, lineHeight: 19, color: colors.stoneText },
  meta: { ...font.display, fontSize: 13, lineHeight: 17, color: colors.stoneText },
  flag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", maxWidth: "100%", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  flagAvoid: { backgroundColor: colors.chiliSoft },
  flagCheck: { backgroundColor: colors.amberTint },
  flagText: { ...font.displayBold, fontSize: 12, flexShrink: 1 },
});
