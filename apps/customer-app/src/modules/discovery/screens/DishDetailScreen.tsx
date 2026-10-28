import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../shared/api/client";
import { Dish, MODE_ICON, MODE_LABEL, Mode } from "../../../shared/api/types";
import { useCart } from "../../ordering/CartContext";
import { useCatalog } from "../CatalogContext";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import Badge from "../../../shared/components/Badge";
import DishImage from "../../../shared/components/DishImage";
import { colors, radius, spacing, type, fonts, shadow } from "../../../shared/theme/theme";

type Review = { id: string; userName: string; rating: number; comment?: string };

export default function DishDetailScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { dishId } = route.params;
  const { merchantById } = useCatalog();
  const { addToCart, lastMode } = useCart();
  const [dish, setDish] = useState<Dish | null>(null);
  const [reviews, setReviews] = useState<{ average: number | null; count: number; reviews: Review[] }>({ average: null, count: 0, reviews: [] });
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<Mode>(lastMode);
  const [options, setOptions] = useState<string[]>([]);
  const [fav, setFav] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", "/dishes").then((r) => setDish(r.dishes.find((d) => d.id === dishId) ?? null)).catch(() => {});
    api("GET", `/dishes/${dishId}/reviews`).then(setReviews).catch(() => {});
  }, [dishId]);

  const merchant = dish ? merchantById[dish.merchantId] : undefined;
  const modes: Mode[] = useMemo(() => (merchant?.dineInOnly ? ["dine_in"] : ["dine_in", "takeaway", "delivery"]), [merchant]);
  useEffect(() => {
    if (merchant?.dineInOnly) setMode("dine_in");
  }, [merchant]);

  if (!dish || !merchant) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}><Text style={type.bodyMuted}>Loading…</Text></View>;
  }
  const unavailable = dish.soldOut || !merchant.openNow;

  async function handleAdd() {
    if (!dish || !merchant) return;
    const ok = await addToCart(dish, merchant, { mode, qty, options });
    if (!ok) return;
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
              <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn} testID="back">
                <Ionicons name="chevron-back" size={20} color={colors.ink} />
              </Pressable>
            )}
            <Pressable onPress={() => setFav((f) => !f)} hitSlop={10} style={[styles.circleBtn, fav && { backgroundColor: colors.chili }]}>
              <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? colors.white : colors.chili} />
            </Pressable>
          </View>
          <View style={styles.photoWrap}>
            <DishImage dish={dish} imageStyle={StyleSheet.absoluteFill} emojiStyle={styles.heroEmoji} />
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
              <Text style={styles.metaText}>{reviews.average ?? "New"}{reviews.count ? ` (${reviews.count})` : ""}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={13} color={colors.stone} />
              <Text style={styles.metaText}>{merchant.distanceKm} km</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <Badge label={dish.category} tone="neutral" />
            {dish.dietary.includes("spicy") && <Badge label="🌶 Spicy" tone="danger" />}
            {dish.dietary.includes("vegetarian") && <Badge label="🌿 Vegetarian" tone="success" />}
            {dish.dietary.includes("plant_based") && <Badge label="🌱 Plant-based" tone="success" />}
            {dish.dietary.includes("allergy_free") && <Badge label="🛡 Allergy-free" tone="success" />}
            {dish.style && <Badge label={dish.style === "dry" ? "Dry" : "Wet / soup"} tone="neutral" />}
            {merchant.tags.includes("Halal-friendly") && <Badge label="☪ Halal-friendly" tone="success" />}
            {dish.soldOut && <Badge label="Sold out" tone="danger" />}
          </View>

          <Text style={[type.body, { marginTop: spacing.md, lineHeight: 21 }]}>{dish.description}</Text>

          <View style={styles.merchantCard}>
            <View style={[styles.merchantDot, { backgroundColor: merchant.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{merchant.name}</Text>
              <Text style={type.bodyMuted}>
                {merchant.stallNo} · {merchant.openNow ? "Open now" : `Closed (${merchant.hours.open}-${merchant.hours.close})`}
              </Text>
            </View>
          </View>

          {!unavailable && (
            <>
              <Text style={styles.sectionLabel}>How do you want it?</Text>
              <View style={styles.modeRow}>
                {modes.map((m) => (
                  <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeChip, mode === m && styles.modeChipOn]} testID={`mode-${m}`}>
                    <Ionicons name={MODE_ICON[m] as any} size={14} color={mode === m ? colors.white : colors.ink} />
                    <Text style={[styles.modeText, mode === m && { color: colors.white }]}>{MODE_LABEL[m]}</Text>
                  </Pressable>
                ))}
              </View>
              {merchant.dineInOnly && <Text style={type.small}>This restaurant is dine-in only right now.</Text>}

              {dish.customisations.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Customise</Text>
                  {dish.customisations.map((c) => {
                    const on = options.includes(c);
                    return (
                      <Pressable key={c} style={styles.optRow} onPress={() => setOptions((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}>
                        <View style={[styles.box, on && styles.boxOn]}>{on && <Ionicons name="checkmark" size={13} color={colors.white} />}</View>
                        <Text style={type.body}>{c}</Text>
                      </Pressable>
                    );
                  })}
                </>
              )}

              <View style={styles.qtyRow}>
                <Text style={type.h3}>Quantity</Text>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepperBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                    <Ionicons name="remove" size={16} color={colors.ink} />
                  </Pressable>
                  <Text style={styles.qtyValue}>{qty}</Text>
                  <Pressable style={styles.stepperBtn} onPress={() => setQty((q) => Math.min(20, q + 1))}>
                    <Ionicons name="add" size={16} color={colors.ink} />
                  </Pressable>
                </View>
              </View>
            </>
          )}
          {!merchant.openNow && <Text style={styles.note}>{merchant.name} is closed right now, so you can't order yet.</Text>}

          <Text style={styles.sectionLabel}>Reviews {reviews.count ? `(${reviews.count})` : ""}</Text>
          {reviews.reviews.length === 0 ? (
            <Text style={type.bodyMuted}>No reviews yet. Order this dish and be the first to rate it.</Text>
          ) : (
            reviews.reviews.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.review}>
                <Text style={type.h3}>{r.userName} · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Text>
                {r.comment ? <Text style={type.body}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <PrimaryButton
            label={
              dish.soldOut ? "Currently sold out" : !merchant.openNow ? "Restaurant is closed" : justAdded ? "Added to cart ✓" : `Add ${qty} to cart · RM ${(dish.price * qty).toFixed(2)}`
            }
            disabled={unavailable}
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
    overflow: "hidden",
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
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
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
  sectionLabel: { ...type.h3, marginTop: spacing.xl, marginBottom: spacing.sm },
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeChip: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper },
  modeChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { fontFamily: fonts.display, fontSize: 12.5, color: colors.ink },
  optRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.stone, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  review: { backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, gap: 2 },
  note: { fontFamily: fonts.display, fontSize: 12.5, color: colors.chili, marginTop: spacing.sm },
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
