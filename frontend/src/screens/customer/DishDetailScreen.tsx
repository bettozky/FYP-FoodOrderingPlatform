import React, { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dishes, merchants } from "../../data/mockData";
import { useCart } from "../../context/CartContext";
import PrimaryButton from "../../components/PrimaryButton";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type, fonts, shadow } from "../../theme/theme";

export default function DishDetailScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { dishId } = route.params;
  const dish = useMemo(() => dishes.find((d) => d.id === dishId)!, [dishId]);
  const merchant = useMemo(() => merchants.find((m) => m.id === dish.merchantId)!, [dish]);
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [fav, setFav] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  function handleAdd() {
    for (let i = 0; i < qty; i++) addToCart(dish);
    setJustAdded(true);
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.06, speed: 50, bounciness: 10, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, speed: 30, bounciness: 8, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      navigation.navigate("Cart");
      setJustAdded(false);
    }, 450);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <ScrollView contentContainerStyle={styles.wrap} bounces={false}>
        <View style={styles.hero}>
          <View style={[styles.heroTopRow, { paddingTop: insets.top + spacing.md }]}>
            {navigation.canGoBack() && (
              <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.ink} />
              </Pressable>
            )}
            <Pressable onPress={() => setFav((f) => !f)} hitSlop={10} style={[styles.circleBtn, fav && { backgroundColor: colors.chili }]}>
              <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? colors.white : colors.chili} />
            </Pressable>
          </View>
          <View style={styles.photoWrap}>
            <Text style={styles.heroEmoji}>{dish.image}</Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Text style={[type.h1, { flex: 1 }]}>{dish.name}</Text>
            <Text style={type.price}>RM {dish.price.toFixed(2)}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={13} color={colors.stone} />
              <Text style={styles.metaText}>{merchant.prepMinutes} min</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="flame-outline" size={13} color={colors.stone} />
              <Text style={styles.metaText}>{dish.calories} cal</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="star" size={12} color={colors.turmericDeep} />
              <Text style={styles.metaText}>{merchant.rating}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <Badge label={dish.category} tone="neutral" />
            {dish.spicy && <Badge label="Spicy" tone="danger" />}
            {dish.soldOut && <Badge label="Sold out" tone="danger" />}
          </View>

          <Text style={[type.body, { marginTop: spacing.md, lineHeight: 21 }]}>{dish.description}</Text>

          <View style={styles.merchantCard}>
            <View style={[styles.merchantDot, { backgroundColor: merchant.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{merchant.name}</Text>
              <Text style={type.bodyMuted}>{merchant.stallNo}</Text>
            </View>
          </View>

          {!dish.soldOut && (
            <View style={styles.qtyRow}>
              <Text style={type.h3}>Quantity</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepperBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                  <Ionicons name="remove" size={16} color={colors.ink} />
                </Pressable>
                <Text style={styles.qtyValue}>{qty}</Text>
                <Pressable style={styles.stepperBtn} onPress={() => setQty((q) => q + 1)}>
                  <Ionicons name="add" size={16} color={colors.ink} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <PrimaryButton
            label={
              dish.soldOut
                ? "Currently sold out"
                : justAdded
                ? "Added to cart ✓"
                : `Add ${qty} to cart · RM ${(dish.price * qty).toFixed(2)}`
            }
            disabled={dish.soldOut}
            onPress={handleAdd}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 120, flexGrow: 1 },
  hero: { height: 300, backgroundColor: colors.ink, alignItems: "center" },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  photoWrap: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.paperDim,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    borderWidth: 6,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroEmoji: { fontSize: 88 },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    marginTop: -24,
    flex: 1,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: fonts.display, fontSize: 12.5, color: colors.stone },
  badgeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
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
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: { fontSize: 18, fontFamily: fonts.displayBold, minWidth: 20, textAlign: "center" },
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
