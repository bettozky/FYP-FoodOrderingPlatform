import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dish, Merchant } from "../../../shared/api/types";
import { colors, radius, shadow, spacing, type, fonts } from "../../../shared/theme/theme";
import Badge from "../../../shared/components/Badge";
import { useFavourites } from "../../favourites/FavouritesContext";

type Props = {
  dish: Dish;
  merchant?: Merchant;
  onPress: () => void;
  onAdd?: () => void;
};

export default function DishCard({ dish, merchant, onPress, onAdd }: Props) {
  const { isFav, toggle } = useFavourites();
  const fav = isFav(dish.id);
  const [justAdded, setJustAdded] = useState(false);
  const closed = !!merchant && !merchant.openNow;
  const unavailable = dish.soldOut || closed;
  const btnScale = useRef(new Animated.Value(1)).current;
  const flyScale = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;
  const flyOpacity = useRef(new Animated.Value(0)).current;

  function handleAdd() {
    onAdd?.();
    setJustAdded(true);

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.25, speed: 50, bounciness: 16, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, speed: 30, bounciness: 8, useNativeDriver: true }),
    ]).start();

    flyScale.setValue(0);
    flyY.setValue(0);
    flyOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(flyY, { toValue: -34, duration: 480, useNativeDriver: true }),
      Animated.timing(flyScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(flyOpacity, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();

    setTimeout(() => setJustAdded(false), 700);
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.imageOuter}>
        <View style={[styles.imageWrap, { backgroundColor: merchant?.color ?? colors.surfaceAlt }]}>
          <Text style={styles.emoji}>{dish.image}</Text>
          {unavailable && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>{dish.soldOut ? "Sold out" : "Closed"}</Text>
            </View>
          )}
        </View>
        <Pressable
          hitSlop={11}
          onPress={(e) => {
            e.stopPropagation?.();
            toggle(dish.id);
          }}
          style={styles.favBtn}
          accessibilityRole="button"
          accessibilityLabel={fav ? `Remove ${dish.name} from favourites` : `Add ${dish.name} to favourites`}
        >
          <Ionicons name={fav ? "heart" : "heart-outline"} size={13} color={fav ? colors.chili : colors.stone} />
        </Pressable>
      </View>
      <View style={styles.info}>
        <Text style={type.h3} numberOfLines={2}>
          {dish.name}
        </Text>
        {merchant && (
          <View style={styles.metaRow}>
            <View style={[styles.statusDot, { backgroundColor: merchant.openNow ? colors.herb : colors.chili }]} />
            <Text style={styles.merchantName} numberOfLines={1}>{merchant.name}</Text>
          </View>
        )}
        {merchant && (
          <Text style={styles.metaText} numberOfLines={2}>
            {merchant.openNow ? "Open" : `Closed · opens ${merchant.hours.open}`}  ·  {merchant.distanceKm} km  ·  {merchant.prepMinutes} min
          </Text>
        )}
        <View style={styles.row}>
          <Text style={type.price}>RM {dish.price.toFixed(2)}</Text>
          {dish.dietary.includes("spicy") && <Badge label="Spicy" tone="danger" />}
          {dish.dietary.includes("vegetarian") && <Badge label="Vegetarian" tone="success" />}
          {dish.dietary.includes("plant_based") && <Badge label="Plant-based" tone="success" />}
          {merchant?.tags.includes("Halal-friendly") && <Badge label="Halal-friendly" tone="neutral" />}
        </View>
      </View>
      {!unavailable && onAdd && (
        <View style={{ position: "relative" }}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flyBadge,
              {
                opacity: flyOpacity,
                transform: [{ translateY: flyY }, { scale: flyScale }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.herb} />
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                handleAdd();
              }}
              hitSlop={10}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel={`Add ${dish.name} to cart`}
            >
              <Ionicons name={justAdded ? "checkmark" : "add"} size={20} color={colors.white} />
            </Pressable>
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "visible",
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
  },
  imageOuter: { position: "relative" },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  emoji: { fontSize: 32 },
  soldOutOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutText: { color: colors.white, fontSize: 10, fontFamily: fonts.displayBold, textAlign: "center" },
  favBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  info: { flex: 1, paddingHorizontal: spacing.md, gap: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  merchantName: { flexShrink: 1, fontSize: 12.5, fontFamily: fonts.display, color: colors.stoneText },
  metaText: { fontSize: 12, fontFamily: fonts.serifMedium, color: colors.stoneText },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2, flexWrap: "wrap" },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  flyBadge: {
    position: "absolute",
    top: -4,
    right: spacing.sm + 6,
    zIndex: 10,
  },
});
