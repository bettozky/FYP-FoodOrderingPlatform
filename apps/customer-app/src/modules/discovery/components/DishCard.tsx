import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dish, Merchant } from "../../../shared/api/types";
import { colors, shadow, spacing, type, fonts, ui } from "../../../shared/theme/theme";
import DishImage, { softTint } from "../../../shared/components/DishImage";
import { useFavourites } from "../../favourites/FavouritesContext";

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
          <Ionicons name={justAdded ? "checkmark" : "add"} size={18} color={justAdded ? colors.white : colors.ink} />
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

  const label = `${dish.name}, RM ${dish.price.toFixed(2)}${merchant && showMerchant ? `, from ${merchant.name}` : ""}${overlay ? `, ${overlay}` : ""}`;

  if (variant === "grid") {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.gridCard, width ? { width } : { flex: 1 }, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={label} testID={`dish-${dish.id}`}>
        <View style={styles.gridImageWrap}>
          <DishImage image={dish.image} size={104} tint={tint} overlay={overlay} style={styles.gridImage} />
          {merchant ? (
            <View style={styles.rating}>
              <Text style={styles.ratingText}>{merchant.rating.toFixed(1)}★</Text>
            </View>
          ) : null}
          {heart}
        </View>
        <View style={styles.gridInfo}>
          <Text style={styles.name} numberOfLines={2}>{dish.name}</Text>
          {merchant && showMerchant ? (
            <Text style={styles.meta} numberOfLines={2}>{merchant.name} · {merchant.prepMinutes} min</Text>
          ) : null}
          <View style={styles.bottom}>
            <Text style={ui.price}>RM {dish.price.toFixed(2)}</Text>
            {addButton}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={label} testID={`dish-${dish.id}`}>
      <DishImage image={dish.image} size={68} tint={tint} overlay={overlay} />
      <View style={styles.rowInfo}>
        <Text style={styles.name} numberOfLines={2}>{dish.name}</Text>
        {dish.description ? <Text style={styles.desc} numberOfLines={2}>{dish.description}</Text> : null}
        {merchant && showMerchant ? (
          <Text style={styles.meta} numberOfLines={1}>
            {merchant.name} · {merchant.openNow ? `${merchant.distanceKm} km` : `opens ${merchant.hours.open}`}
          </Text>
        ) : null}
        <Text style={[ui.price, { marginTop: 2 }]}>RM {dish.price.toFixed(2)}</Text>
      </View>
      <View style={styles.rowSide}>
        {heart}
        {addButton}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridCard: { ...ui.card, overflow: "hidden", padding: spacing.sm, ...shadow.soft },
  gridImageWrap: { position: "relative" },
  gridImage: { width: "100%", height: 104 },
  rating: { position: "absolute", top: 6, left: 6, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  ratingText: { fontFamily: fonts.displayBold, fontSize: 10.5, color: colors.ink },
  heartGrid: { ...ui.iconButton, position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 14 },
  gridInfo: { paddingTop: spacing.sm, paddingHorizontal: 2, gap: 2, flex: 1 },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: spacing.xs },

  rowCard: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.md },
  rowInfo: { flex: 1, minWidth: 0, gap: 2 },
  rowSide: { alignItems: "center", justifyContent: "center", gap: spacing.sm },
  heartRow: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },

  name: { ...type.h3, fontFamily: fonts.displayBold, fontSize: 14 },
  desc: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 16, color: colors.stoneText },
  meta: { fontFamily: fonts.display, fontSize: 11.5, color: colors.stoneText },
});
