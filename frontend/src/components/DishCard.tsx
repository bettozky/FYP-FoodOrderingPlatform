import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Dish, Merchant } from "../data/mockData";
import { colors, radius, shadow, spacing, type } from "../theme/theme";
import Badge from "./Badge";

type Props = {
  dish: Dish;
  merchant?: Merchant;
  onPress: () => void;
  onAdd?: () => void;
};

export default function DishCard({ dish, merchant, onPress, onAdd }: Props) {
  return (
    <Pressable
      onPress={dish.soldOut ? undefined : onPress}
      style={({ pressed }) => [styles.card, shadow.card, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.imageWrap, { backgroundColor: merchant?.color ?? colors.surfaceAlt }]}>
        <Text style={styles.emoji}>{dish.image}</Text>
        {dish.soldOut && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>Sold out</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={type.h3} numberOfLines={1}>
          {dish.name}
        </Text>
        {merchant && (
          <Text style={type.small} numberOfLines={1}>
            {merchant.name} · {merchant.distanceKm} km
          </Text>
        )}
        <View style={styles.row}>
          <Text style={type.price}>RM {dish.price.toFixed(2)}</Text>
          {dish.spicy && <Badge label="Spicy" tone="danger" />}
        </View>
      </View>
      {!dish.soldOut && onAdd && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onAdd();
          }}
          hitSlop={8}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  imageWrap: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 36 },
  soldOutOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  info: { flex: 1, paddingHorizontal: spacing.md, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  addBtnText: { color: colors.primaryDark, fontSize: 20, fontWeight: "700", marginTop: -2 },
});
