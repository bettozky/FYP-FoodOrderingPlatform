import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorText } from "../../../shared/api/client";
import { Dish } from "../../../shared/api/types";
import { useCart } from "../../ordering/CartContext";
import { useCatalog } from "../CatalogContext";
import DishCard from "../components/DishCard";
import EmptyState from "../../../shared/components/EmptyState";
import { colors, fonts, radius, spacing, type, ui } from "../../../shared/theme/theme";

// Stall menu (new screen, Badrul's mock-up Oct 2026). Route: navigation.navigate("Stall", { merchantId }).
// Stall-colour band with a big dish picture → floating info card (name, Open pill, stall no. and tags,
// rating / prep time / delivery chips) → Menu · Reviews · Info tabs → dark "View cart" bar.
type Tab = "menu" | "reviews" | "info";
type Review = { id: string; userName: string; rating: number; comment?: string; dishName: string };
type MenuFilter = "all" | "dry" | "wet" | "vegetarian";
const FILTER_LABEL: Record<MenuFilter, string> = { all: "All", dry: "Dry", wet: "Wet / soup", vegetarian: "Vegetarian" };

export default function StallScreen({ navigation, route }: any) {
  const { merchantId } = route.params;
  const insets = useSafeAreaInsets();
  const { merchantById } = useCatalog();
  const { addToCart, merchant: cartMerchant, itemCount, subtotal } = useCart();
  const merchant = merchantById[merchantId];
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("menu");
  const [filter, setFilter] = useState<MenuFilter>("all");
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", `/dishes?merchantId=${encodeURIComponent(merchantId)}`)
      .then((r) => { setDishes(r.dishes); setError(""); })
      .catch((e) => setError(errorText(e)));
  }, [merchantId]);

  // Reviews are stored per dish, so the stall's reviews are its dishes' reviews put together.
  useEffect(() => {
    if (tab !== "reviews" || reviews || !dishes) return;
    Promise.all(
      dishes.map((d) =>
        api<{ reviews: Omit<Review, "dishName">[] }>("GET", `/dishes/${d.id}/reviews`)
          .then((r) => r.reviews.map((x) => ({ ...x, dishName: d.name })))
          .catch(() => [] as Review[])
      )
    ).then((all) => setReviews(all.flat()));
  }, [tab, dishes, reviews]);

  // Only show filter chips that match at least one dish.
  const filters = useMemo(() => {
    const has: Record<MenuFilter, boolean> = {
      all: true,
      dry: !!dishes?.some((d) => d.style === "dry"),
      wet: !!dishes?.some((d) => d.style === "wet"),
      vegetarian: !!dishes?.some((d) => d.dietary.includes("vegetarian")),
    };
    return (Object.keys(has) as MenuFilter[]).filter((k) => has[k]);
  }, [dishes]);

  const shown = (dishes ?? [])
    .filter((d) => filter === "all" || (filter === "vegetarian" ? d.dietary.includes("vegetarian") : d.style === filter))
    .sort((a, b) => Number(a.soldOut) - Number(b.soldOut));

  if (!merchant) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {error ? <Text style={type.bodyMuted}>{error}</Text> : <ActivityIndicator color={colors.ink} />}
      </View>
    );
  }

  const heroImage = dishes?.find((d) => !d.soldOut)?.image ?? dishes?.[0]?.image ?? "🍽️";
  const cartHere = cartMerchant?.id === merchant.id && itemCount > 0;
  const avg = reviews && reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: cartHere ? 120 + insets.bottom : spacing.xxl + insets.bottom }}>
        <View style={[styles.hero, { backgroundColor: merchant.color || colors.turmericDeep, paddingTop: insets.top + spacing.sm }]}>
          <Pressable style={ui.iconButton} onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back" testID="back">
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={styles.heroEmoji} allowFontScaling={false} accessibilityElementsHidden importantForAccessibility="no">{heroImage}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={[type.h2, { flex: 1 }]} accessibilityRole="header">{merchant.name}</Text>
            <View style={[styles.pill, { backgroundColor: merchant.openNow ? colors.herbLight : colors.chiliSoft }]}>
              <Text style={[styles.pillText, { color: merchant.openNow ? colors.herb : colors.chiliText }]}>{merchant.openNow ? "Open" : "Closed"}</Text>
            </View>
          </View>
          <Text style={styles.sub}>{[merchant.stallNo, ...merchant.tags].join(" · ")}</Text>
          <View style={styles.chips}>
            <View style={[ui.infoChip, { backgroundColor: colors.amberTint }]}>
              <Text style={ui.infoChipText}>{merchant.rating.toFixed(1)}★ rating</Text>
            </View>
            <View style={ui.infoChip}>
              <Text style={ui.infoChipText}>{merchant.prepMinutes} min prep</Text>
            </View>
            <View style={ui.infoChip}>
              <Text style={ui.infoChipText}>{merchant.dineInOnly ? "Dine-in only" : "Delivery"}</Text>
            </View>
          </View>
          {!merchant.openNow ? <Text style={styles.closed}>Closed now · opens {merchant.hours.open}</Text> : null}
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(["menu", "reviews", "info"] as Tab[]).map((t) => {
            const on = tab === t;
            return (
              <Pressable key={t} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: on }} testID={`stall-tab-${t}`}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t === "menu" ? "Menu" : t === "reviews" ? "Reviews" : "Info"}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {tab === "menu" ? (
          <>
            {filters.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {filters.map((f) => {
                  const on = filter === f;
                  return (
                    <Pressable key={f} onPress={() => setFilter(f)} style={[ui.chip, on && ui.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} testID={`stall-filter-${f}`}>
                      <Text style={[ui.chipText, on && ui.chipTextOn]}>{FILTER_LABEL[f]}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            <View style={styles.body}>
              {dishes === null && !error ? (
                <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />
              ) : shown.length === 0 ? (
                <EmptyState icon="restaurant-outline" title={dishes?.length ? "No dishes match" : "No dishes yet"} hint={dishes?.length ? "Try another filter." : "This stall hasn't added its menu yet."} />
              ) : (
                shown.map((d) => (
                  <DishCard key={d.id} dish={d} merchant={merchant} showMerchant={false} onPress={() => navigation.navigate("DishDetail", { dishId: d.id })} onAdd={() => addToCart(d, merchant)} />
                ))
              )}
            </View>
          </>
        ) : null}

        {tab === "reviews" ? (
          <View style={styles.body}>
            {reviews === null ? (
              <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />
            ) : reviews.length === 0 ? (
              <EmptyState icon="star-outline" title="No reviews yet" hint="Reviews appear after customers rate their dishes." />
            ) : (
              <>
                <Text style={[type.bodyMuted, { marginBottom: spacing.md }]}>{avg}★ from {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</Text>
                {reviews.map((r) => (
                  <View key={r.id} style={styles.review}>
                    <View style={styles.reviewTop}>
                      <Text style={type.h3}>{r.userName}</Text>
                      <Text style={styles.stars} accessibilityLabel={`${r.rating} out of 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Text>
                    </View>
                    <Text style={type.small}>{r.dishName}</Text>
                    {r.comment ? <Text style={type.bodyMuted}>{r.comment}</Text> : null}
                  </View>
                ))}
              </>
            )}
          </View>
        ) : null}

        {tab === "info" ? (
          <View style={[styles.body, { gap: spacing.sm }]}>
            <InfoRow icon="location-outline" label="Where" value={merchant.stallNo} />
            <InfoRow icon="time-outline" label="Opening hours" value={`${merchant.hours.open} – ${merchant.hours.close}`} />
            {merchant.venueCategory ? <InfoRow icon="pricetag-outline" label="Type" value={merchant.venueCategory} /> : null}
            <InfoRow icon="bicycle-outline" label="Ways to order" value={merchant.dineInOnly ? "Dine-in only" : "Dine-in, takeaway or delivery"} />
            <InfoRow icon="navigate-outline" label="Distance" value={`${merchant.distanceKm} km from your address`} />
            {merchant.phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${merchant.phone.replace(/\s/g, "")}`)} accessibilityRole="button" accessibilityLabel={`Call ${merchant.name}`}>
                <InfoRow icon="call-outline" label="Phone" value={merchant.phone} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {cartHere ? (
        <View style={[styles.barWrap, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable style={ui.bottomBar} onPress={() => navigation.navigate("Cart")} accessibilityRole="button" accessibilityLabel={`View cart, ${itemCount} items, RM ${subtotal.toFixed(2)}`} testID="stall-view-cart">
            <Text style={ui.bottomBarText}>
              {itemCount} {itemCount === 1 ? "item" : "items"} · RM {subtotal.toFixed(2)}
            </Text>
            <View style={styles.barButton}>
              <Text style={styles.barButtonText}>View cart</Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.amberText} />
      <View style={{ flex: 1 }}>
        <Text style={type.small}>{label}</Text>
        <Text style={type.body}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  hero: { height: 230, paddingHorizontal: spacing.lg },
  heroEmoji: { fontSize: 84, textAlign: "center", marginTop: spacing.xs },
  infoCard: { ...ui.cardRaised, marginHorizontal: spacing.lg, marginTop: -48, padding: spacing.lg, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontFamily: fonts.displayBold, fontSize: 11 },
  sub: { fontFamily: fonts.display, fontSize: 12, color: colors.stoneText },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  closed: { fontFamily: fonts.display, fontSize: 12, color: colors.chiliText, marginTop: spacing.xs },
  tabs: { flexDirection: "row", marginHorizontal: spacing.lg, marginTop: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.stoneLine },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  tabOn: { borderBottomColor: colors.turmeric },
  tabText: { fontFamily: fonts.display, fontSize: 13, color: colors.stoneText },
  tabTextOn: { fontFamily: fonts.displayBold, color: colors.ink },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingTop: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  review: { ...ui.card, padding: spacing.md, marginBottom: spacing.sm, gap: 2 },
  reviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  stars: { color: colors.turmericDeep, fontSize: 13 },
  infoRow: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  error: { color: colors.chiliText, fontFamily: fonts.display, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  barWrap: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 0 },
  barButton: { backgroundColor: colors.turmeric, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 44, justifyContent: "center" },
  barButtonText: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
});
