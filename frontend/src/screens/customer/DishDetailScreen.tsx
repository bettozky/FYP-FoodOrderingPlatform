import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { dishes, merchants } from "../../data/mockData";
import { useCart } from "../../context/CartContext";
import ScreenHeader from "../../components/ScreenHeader";
import PrimaryButton from "../../components/PrimaryButton";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type } from "../../theme/theme";

export default function DishDetailScreen({ route, navigation }: any) {
  const { dishId } = route.params;
  const dish = useMemo(() => dishes.find((d) => d.id === dishId)!, [dishId]);
  const merchant = useMemo(() => merchants.find((m) => m.id === dish.merchantId)!, [dish]);
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="" showBack />
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={[styles.hero, { backgroundColor: merchant.color }]}>
          <Text style={styles.heroEmoji}>{dish.image}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={type.h1}>{dish.name}</Text>
            <Text style={type.price}>RM {dish.price.toFixed(2)}</Text>
          </View>

          <View style={styles.badgeRow}>
            <Badge label={dish.category} tone="neutral" />
            {dish.spicy && <Badge label="Spicy" tone="danger" />}
            {dish.soldOut && <Badge label="Sold out" tone="danger" />}
          </View>

          <Text style={[type.body, { marginTop: spacing.md }]}>{dish.description}</Text>

          <View style={styles.merchantCard}>
            <View style={[styles.merchantDot, { backgroundColor: merchant.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{merchant.name}</Text>
              <Text style={type.bodyMuted}>{merchant.stallNo}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={type.body}>⭐ {merchant.rating}</Text>
              <Text style={type.small}>{merchant.prepMinutes} min prep</Text>
            </View>
          </View>

          {!dish.soldOut && (
            <View style={styles.qtyRow}>
              <Text style={type.h3}>Quantity</Text>
              <View style={styles.stepper}>
                <PrimaryButton
                  label="–"
                  variant="outline"
                  style={styles.stepperBtn}
                  onPress={() => setQty((q) => Math.max(1, q - 1))}
                />
                <Text style={styles.qtyValue}>{qty}</Text>
                <PrimaryButton
                  label="+"
                  variant="outline"
                  style={styles.stepperBtn}
                  onPress={() => setQty((q) => q + 1)}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={dish.soldOut ? "Currently sold out" : `Add ${qty} to cart · RM ${(dish.price * qty).toFixed(2)}`}
          disabled={dish.soldOut}
          onPress={() => {
            for (let i = 0; i < qty; i++) addToCart(dish);
            navigation.navigate("Cart");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 120 },
  hero: { height: 180, alignItems: "center", justifyContent: "center" },
  heroEmoji: { fontSize: 84 },
  body: { padding: spacing.lg },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  badgeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  merchantCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  merchantDot: { width: 40, height: 40, borderRadius: 20 },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepperBtn: { width: 40, paddingVertical: 8 },
  qtyValue: { fontSize: 18, fontWeight: "700", minWidth: 20, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
