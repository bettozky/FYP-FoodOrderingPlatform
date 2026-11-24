import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorText } from "../../../shared/api/client";
import { Dish } from "../../../shared/api/types";
import { useCart } from "../../ordering/CartContext";
import { useCatalog } from "../CatalogContext";
import DishCard from "../components/DishCard";
import { useFavourites } from "../../favourites/FavouritesContext";
import ReviewsList from "../../reviews/ReviewsList";
import ReadyChip from "../components/ReadyChip";
import BusyNotice from "../../ordering/components/BusyNotice";
import EmptyState from "../../../shared/components/EmptyState";
import { colors, layout, radius, shadow, spacing, type, ui, font } from "../../../shared/theme/theme";
import { isPhoto, mediaUrl } from "../../../shared/media";
import PressableScale from "../../../shared/motion/PressableScale";
import FadeInView from "../../../shared/motion/FadeInView";
import { PopOnChange } from "../../../shared/motion/PulseRing";
import { DishRowSkeleton } from "../../../shared/motion/Skeleton";
import { dietFit } from "../../diet/diet";
import { useDiet } from "../../diet/useDiet";
import { dietWords } from "../../diet/dietWords";
import { useTranslation } from "react-i18next";
import { allergenList, venueName } from "../../../shared/i18n/labels";

// Stall menu (new screen, Badrul's mock-up Oct 2026). Route: navigation.navigate("Stall", { merchantId }).
// Stall-colour band with a big dish picture → floating info card (name, Open pill, stall no. and tags,
// rating / prep time / delivery chips) → Menu · Reviews · Info tabs → dark "View cart" bar.
type Tab = "menu" | "reviews" | "info";
type MenuFilter = "all" | "dry" | "wet" | "vegetarian";
const FILTER_LABEL = { all: "home.all", dry: "home.dry", wet: "home.wet", vegetarian: "diet.vegetarian" } as const satisfies Record<MenuFilter, string>;
const TAB_LABEL = { menu: "stall.menu", reviews: "stall.reviews", info: "stall.info" } as const satisfies Record<Tab, string>;

export default function StallScreen({ navigation, route }: any) {
  const { merchantId } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { merchantById } = useCatalog();
  const { isFavShop, toggleShop } = useFavourites();
  const { addToCart, merchant: cartMerchant, itemCount, subtotal } = useCart();
  const merchant = merchantById[merchantId];
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("menu");
  const [filter, setFilter] = useState<MenuFilter>("all");

  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", `/dishes?merchantId=${encodeURIComponent(merchantId)}`)
      .then((r) => { setDishes(r.dishes); setError(""); })
      .catch((e) => setError(errorText(e)));
  }, [merchantId]);

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

  // Sprint 3 diet profile: "Hide dishes that don't fit" takes them off the menu, with a way to show them again.
  const { diet } = useDiet();
  const [showHidden, setShowHidden] = useState(false);
  const matching = (dishes ?? [])
    .filter((d) => filter === "all" || (filter === "vegetarian" ? d.dietary.includes("vegetarian") : d.style === filter))
    .sort((a, b) => Number(a.soldOut) - Number(b.soldOut));
  const hiding = !!diet?.hideUnsuitable && !showHidden;
  const hiddenCount = diet?.hideUnsuitable ? matching.filter((d) => dietFit(d, merchant, diet, dietWords()).level === "avoid").length : 0;
  const shown = hiding ? matching.filter((d) => dietFit(d, merchant, diet, dietWords()).level !== "avoid") : matching;

  if (!merchant) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {error ? <Text style={type.bodyMuted}>{error}</Text> : <ActivityIndicator color={colors.ink} />}
      </View>
    );
  }

  const heroImage = merchant.cover || merchant.logo || dishes?.find((d) => !d.soldOut)?.image || dishes?.[0]?.image;
  const heroUri = mediaUrl(heroImage);
  const cartHere = cartMerchant?.id === merchant.id && itemCount > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: cartHere ? 120 + insets.bottom : spacing.xxl + insets.bottom }}>
        <View style={[styles.hero, { backgroundColor: merchant.color || colors.turmericDeep, paddingTop: insets.top + spacing.sm }]}>
          {isPhoto(heroUri) ? (
            <>
              <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
              <View style={[StyleSheet.absoluteFill, styles.heroShade]} pointerEvents="none" />
            </>
          ) : (
            <Ionicons name="restaurant" size={72} color={colors.ink} style={styles.heroIcon} />
          )}
          <Pressable style={[ui.iconButton, { position: "absolute", left: layout.gutter, top: insets.top + spacing.sm }]} onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("common.back")} testID="back">
            <Ionicons name="chevron-back" size={22} color={colors.ink} style={{ marginLeft: -2 }} />
          </Pressable>
          <Pressable style={[ui.iconButton, { position: "absolute", right: layout.gutter, top: insets.top + spacing.sm }]} onPress={() => toggleShop(merchant.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={isFavShop(merchant.id) ? t("stall.unsave") : t("stall.save")} testID="fav-stall">
            <PopOnChange trigger={isFavShop(merchant.id)}>
              <Ionicons name={isFavShop(merchant.id) ? "heart" : "heart-outline"} size={19} color={isFavShop(merchant.id) ? colors.chili : colors.ink} />
            </PopOnChange>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={[type.h2, { flex: 1 }]} accessibilityRole="header">{merchant.name}</Text>
            <View style={[styles.pill, { backgroundColor: merchant.openNow ? colors.herbLight : colors.chiliSoft }]}>
              <Text style={[styles.pillText, { color: merchant.openNow ? colors.herb : colors.chiliText }]}>{merchant.openNow ? t("stall.open") : t("stall.closed")}</Text>
            </View>
          </View>
          <Text style={styles.sub}>{[merchant.stallNo, ...merchant.tags].join(" · ")}</Text>
          <View style={styles.chips}>
            <View style={ui.infoChip} accessibilityLabel={t("common.ratedValue", { rating: merchant.rating.toFixed(1) })}>
              <Ionicons name="star" size={12} color={colors.turmericDeep} />
              <Text style={ui.infoChipText}>{merchant.rating.toFixed(1)}</Text>
            </View>
            <ReadyChip merchant={merchant} />
            <View style={ui.infoChip}>
              <Ionicons name={merchant.dineInOnly ? "restaurant-outline" : "bicycle-outline"} size={13} color={colors.ink} />
              <Text style={ui.infoChipText}>{merchant.dineInOnly ? t("stall.dineInOnly") : t("stall.delivery")}</Text>
            </View>
          </View>
          {!merchant.openNow ? <Text style={styles.closed}>{t("stall.closedNow", { time: merchant.hours.open })}</Text> : null}
          <BusyNotice merchant={merchant} />
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(["menu", "reviews", "info"] as Tab[]).map((k) => {
            const on = tab === k;
            return (
              <Pressable key={k} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} testID={`stall-tab-${k}`}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t(TAB_LABEL[k])}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {tab === "menu" ? (
          <>
            {filters.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chipRow}>
                {filters.map((f) => {
                  const on = filter === f;
                  return (
                    <Pressable key={f} onPress={() => setFilter(f)} style={[ui.chip, on && ui.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} testID={`stall-filter-${f}`}>
                      <Text style={[ui.chipText, on && ui.chipTextOn]}>{t(FILTER_LABEL[f])}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            <View style={styles.body}>
              {hiddenCount > 0 ? (
                <Pressable style={styles.dietNote} onPress={() => setShowHidden((v) => !v)} accessibilityRole="button" testID="diet-hidden-note">
                  <Ionicons name={showHidden ? "eye-off-outline" : "shield-checkmark"} size={16} color={colors.herb} />
                  <Text style={styles.dietNoteText}>
                    {showHidden ? "Showing every dish" : `${hiddenCount} ${hiddenCount === 1 ? "dish" : "dishes"} hidden by your diet profile`}
                  </Text>
                  <Text style={styles.dietNoteLink}>{showHidden ? "Hide again" : "Show"}</Text>
                </Pressable>
              ) : null}
              {dishes === null && !error ? (
                <DishRowSkeleton />
              ) : shown.length === 0 ? (
                <EmptyState icon="restaurant-outline" title={dishes?.length ? t("stall.noMatch") : t("stall.noDishes")} hint={dishes?.length ? t("stall.tryFilter") : t("stall.noMenuYet")} />
              ) : (
                shown.map((d, i) => (
                  <FadeInView key={d.id} index={i}>
                    <DishCard dish={d} merchant={merchant} showMerchant={false} onPress={() => navigation.navigate("DishDetail", { dishId: d.id })} onAdd={() => addToCart(d, merchant)} />
                  </FadeInView>
                ))
              )}
            </View>
          </>
        ) : null}

        {tab === "reviews" ? (
          <View style={styles.body}>
            <ReviewsList merchantId={merchantId} />
          </View>
        ) : null}

        {tab === "info" ? (
          <View style={styles.infoGroup}>
            <InfoRow icon="location-outline" label={t("stall.where")} value={merchant.stallNo} />
            <InfoRow icon="time-outline" label={t("stall.hours")} value={`${merchant.hours.open} – ${merchant.hours.close}`} />
            {merchant.venueCategory ? <InfoRow icon="pricetag-outline" label={t("stall.type")} value={venueName(merchant.venueCategory)} /> : null}
            <InfoRow icon="bicycle-outline" label={t("stall.waysToOrder")} value={merchant.dineInOnly ? t("stall.dineInOnly") : t("stall.allWays")} />
            <InfoRow icon="navigate-outline" label={t("stall.distance")} value={t("stall.kmFromYou", { km: merchant.distanceKm })} />
            <InfoRow
              icon="alert-circle-outline"
              label={t("stall.allergensTitle")}
              value={
                merchant.allergens?.length
                  ? allergenList(merchant.allergens)
                  : merchant.allergens
                    ? t("stall.allergensNone")
                    : t("stall.allergensUnknown")
              }
              last={!merchant.phone}
            />
            {merchant.phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${merchant.phone.replace(/\s/g, "")}`)} style={({ pressed }) => (pressed ? { backgroundColor: colors.paperDim } : null)} accessibilityRole="button" accessibilityLabel={t("stall.call", { name: merchant.name })}>
                <InfoRow icon="call-outline" label={t("stall.phone")} value={merchant.phone} last />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {cartHere ? (
        // Slides up the first time something is added; the count pops each time it goes up.
        <FadeInView distance={40} style={[styles.barWrap, { paddingBottom: insets.bottom + spacing.md }]}>
          <PressableScale style={ui.bottomBar} onPress={() => navigation.navigate("Cart")} accessibilityRole="button" accessibilityLabel={`${t("stall.viewCart")}, ${t("cart.items", { count: itemCount })}, RM ${subtotal.toFixed(2)}`} testID="stall-view-cart">
            <PopOnChange trigger={itemCount}>
              <Text style={ui.bottomBarText}>
                {t("cart.items", { count: itemCount })} · RM {subtotal.toFixed(2)}
              </Text>
            </PopOnChange>
            <View style={styles.barButton}>
              <Text style={styles.barButtonText}>{t("stall.viewCart")}</Text>
            </View>
          </PressableScale>
        </FadeInView>
      ) : null}
    </View>
  );
}

function InfoRow({ icon, label, value, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowLine]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text style={type.small}>{label}</Text>
        <Text style={[type.body, { fontSize: 15 }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dietNote: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.herbLight, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 44, marginBottom: spacing.md },
  dietNoteText: { flex: 1, ...font.display, fontSize: 14, color: colors.herb },
  dietNoteLink: { ...font.displayBold, fontSize: 14, color: colors.ink },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  hero: { height: 260, paddingHorizontal: layout.gutter },
  heroIcon: { alignSelf: "center", marginTop: spacing.xxl, opacity: 0.5 },
  heroShade: { backgroundColor: "rgba(21,19,15,0.10)" },
  infoCard: { ...ui.cardRaised, marginHorizontal: layout.gutter, marginTop: -56, padding: spacing.xl, gap: 6 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { ...font.displayBold, fontSize: 12 },
  sub: { ...font.serif, fontSize: 15, color: colors.stoneText },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  closed: { ...font.display, fontSize: 14, color: colors.chiliText, marginTop: spacing.xs },
  // iOS segmented control
  tabs: { flexDirection: "row", marginHorizontal: layout.gutter, marginTop: spacing.xl, padding: 3, borderRadius: 12, backgroundColor: colors.paperDim },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 36, borderRadius: 9 },
  tabOn: { backgroundColor: colors.paper, ...shadow.soft },
  tabText: { ...font.display, fontSize: 14, color: colors.stoneText },
  tabTextOn: { ...font.displayBold, color: colors.ink },
  chipRow: { paddingHorizontal: layout.gutter, gap: spacing.sm, paddingTop: spacing.lg },
  body: { paddingHorizontal: layout.gutter, paddingTop: spacing.lg },
  infoGroup: { ...ui.group, marginHorizontal: layout.gutter, marginTop: spacing.lg, paddingHorizontal: 0, paddingTop: 0 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  infoRowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.stoneLine },
  infoIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  error: { color: colors.chiliText, ...font.display, fontSize: 14, paddingHorizontal: layout.gutter, marginTop: spacing.md },
  barWrap: { position: "absolute", left: layout.gutter, right: layout.gutter, bottom: 0 },
  barButton: { backgroundColor: colors.turmeric, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 44, justifyContent: "center" },
  barButtonText: { ...font.displayBold, fontSize: 15, color: colors.ink },
});
