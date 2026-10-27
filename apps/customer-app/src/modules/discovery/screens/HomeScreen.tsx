import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, Animated, Modal, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyState from "../../../shared/components/EmptyState";
import { api, errorText } from "../../../shared/api/client";
import { Dish, Merchant } from "../../../shared/api/types";
import { DIETARY_FILTERS } from "../../../shared/data/mockData";
import { useAuth } from "../../auth/AuthContext";
import { useCart } from "../../ordering/CartContext";
import { useCatalog } from "../CatalogContext";
import DishCard from "../components/DishCard";
import StallCard from "../components/StallCard";
import PromoBanner from "../components/PromoBanner";
import { categoriesFromDishes } from "../categories";
import { colors, radius, spacing, type, fonts, shadow, ui } from "../../../shared/theme/theme";

// Home, from Badrul's mock-up (Oct 2026):
// "Deliver to" + cart → "Hi <name>, what are you craving?" → search + filter button
// → amber "How it works" card → venue tiles (Trending, Buffet, …) → "Popular near you" row → stalls near you.
// Typing a search, using the filter sheet or "See all" switches the list to a 2-column grid of dishes.
// Search and filters are answered by the server (FR-1.3, FR-1.4).
const VENUE_ORDER = ["Trending", "Buffet", "Luxury", "Aesthetic Cafe"];
const VENUE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Trending: "trending-up",
  Buffet: "restaurant-outline",
  Luxury: "diamond-outline",
  "Aesthetic Cafe": "cafe-outline",
};

type Row = { kind: "stall"; merchant: Merchant } | { kind: "dish"; dish: Dish };

export default function HomeScreen({ navigation }: any) {
  const { name } = useAuth();
  const { addToCart, itemCount } = useCart();
  const { merchants, merchantById, addresses, address, setAddress, loadError } = useCatalog();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<Row>>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [diet, setDiet] = useState<string[]>([]);
  const [style, setStyle] = useState<"" | "dry" | "wet">("");
  const [venue, setVenue] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [error, setError] = useState("");
  const [pickAddress, setPickAddress] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The full menu: categories, stall pictures and "Popular near you" come from it.
  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", "/dishes").then((r) => setAllDishes(r.dishes)).catch(() => {});
  }, []);
  const categories = useMemo(() => categoriesFromDishes(allDishes), [allDishes]);
  useEffect(() => {
    if (!categories.includes(category)) setCategory("All");
  }, [categories, category]);

  // Cart badge pops when something is added.
  const cartScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(itemCount);
  useEffect(() => {
    if (itemCount > prevCount.current) {
      cartScale.setValue(1);
      Animated.sequence([
        Animated.spring(cartScale, { toValue: 1.3, speed: 40, bounciness: 14, useNativeDriver: true }),
        Animated.spring(cartScale, { toValue: 1, speed: 30, bounciness: 10, useNativeDriver: true }),
      ]).start();
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams();
        if (query.trim()) qs.set("q", query.trim());
        if (diet.length) qs.set("dietary", diet.join(","));
        if (style) qs.set("style", style);
        const r = await api<{ dishes: Dish[] }>("GET", `/dishes?${qs}`);
        setDishes(r.dishes);
        setError("");
      } catch (e) {
        setError(errorText(e));
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, diet, style]);

  const inVenue = (merchantId: string) => !venue || merchantById[merchantId]?.venueCategory === venue;
  const byOpenThenNear = (a?: Merchant, b?: Merchant) =>
    Number(!!b?.openNow) - Number(!!a?.openNow) || (a?.distanceKm ?? 99) - (b?.distanceKm ?? 99);

  const venues = useMemo(() => {
    const used = new Set(merchants.map((m) => m.venueCategory).filter(Boolean) as string[]);
    return [...VENUE_ORDER.filter((v) => used.has(v)), ...[...used].filter((v) => !VENUE_ORDER.includes(v))];
  }, [merchants]);

  const stalls = useMemo(
    () => merchants.filter((m) => !venue || m.venueCategory === venue).sort(byOpenThenNear),
    [merchants, venue] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const stallImage = useMemo(() => {
    const out: Record<string, string> = {};
    for (const d of allDishes) if (!out[d.merchantId]) out[d.merchantId] = d.image;
    return out;
  }, [allDishes]);

  // Popular near you: dishes you can order now, from the best-rated nearby stalls.
  const popular = useMemo(
    () =>
      allDishes
        .filter((d) => !d.soldOut && merchantById[d.merchantId]?.openNow && inVenue(d.merchantId))
        .sort((a, b) => {
          const ma = merchantById[a.merchantId], mb = merchantById[b.merchantId];
          return (mb?.rating ?? 0) - (ma?.rating ?? 0) || (ma?.distanceKm ?? 99) - (mb?.distanceKm ?? 99);
        })
        .slice(0, 10),
    [allDishes, merchantById, venue] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Grid results: open stalls first, then nearest; sold-out dishes last.
  const results = dishes
    .filter((d) => (category === "All" || d.category === category) && inVenue(d.merchantId))
    .sort((a, b) => byOpenThenNear(merchantById[a.merchantId], merchantById[b.merchantId]) || Number(a.soldOut) - Number(b.soldOut));

  const filterCount = (category !== "All" ? 1 : 0) + diet.length + (style ? 1 : 0);
  const gridMode = showAll || !!query.trim() || filterCount > 0;
  const rows: Row[] = gridMode ? results.map((dish) => ({ kind: "dish", dish })) : stalls.map((merchant) => ({ kind: "stall", merchant }));
  const toggleDiet = (k: string) => setDiet((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const clearFilters = () => { setCategory("All"); setDiet([]); setStyle(""); };
  const firstName = (name || "there").split(" ")[0];

  function browseStalls() {
    setShowAll(false);
    setQuery("");
    clearFilters();
    // Wait for the list to switch back to stalls, then scroll to the first one.
    setTimeout(() => {
      if (stalls.length) list.current?.scrollToIndex({ index: 0, viewOffset: 56, animated: true });
    }, 50);
  }

  const openDish = (d: Dish) => navigation.navigate("DishDetail", { dishId: d.id });
  const addDish = (d: Dish) => {
    const m = merchantById[d.merchantId];
    return m ? addToCart(d, m) : false;
  };

  const header = (
    <View>
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.md }]}>
        <Pressable style={styles.addr} onPress={() => setPickAddress(true)} testID="address-row" accessibilityRole="button" accessibilityLabel={`Deliver to ${address.line}. Change`}>
          <View style={styles.addrIcon}>
            <Ionicons name="location-outline" size={16} color={colors.amberText} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.addrLabel}>Deliver to</Text>
            <Text style={styles.addrText} numberOfLines={1}>{address.line}</Text>
          </View>
        </Pressable>
        <Animated.View style={{ transform: [{ scale: cartScale }] }}>
          <Pressable style={ui.iconButton} onPress={() => navigation.navigate("Cart")} testID="cart-pill" accessibilityRole="button" accessibilityLabel={itemCount ? `Cart, ${itemCount} items` : "Cart, empty"}>
            <Ionicons name="bag-handle-outline" size={18} color={colors.ink} />
            {itemCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </View>

      <Text style={[type.h1, styles.greeting]} accessibilityRole="header">
        Hi {firstName},{"\n"}what are you craving?
      </Text>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.stone} />
          <TextInput
            style={styles.searchInput}
            accessibilityLabel="Search dishes or stalls"
            placeholder="Search dishes or stalls"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            testID="search-input"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={colors.stone} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.filterBtn} onPress={() => setFiltersOpen(true)} accessibilityRole="button" accessibilityLabel={filterCount ? `Filters, ${filterCount} on` : "Filters"} testID="filters-button">
          <Ionicons name="options-outline" size={19} color={colors.white} />
          {filterCount ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {!gridMode ? <PromoBanner onBrowse={browseStalls} /> : null}

      {venues.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueRow}>
          {venues.map((v) => {
            const on = venue === v;
            return (
              <Pressable key={v} onPress={() => setVenue(on ? "" : v)} style={[styles.venueTile, on && styles.venueTileOn]} accessibilityRole="button" accessibilityState={{ selected: on }} testID={`venue-${v}`}>
                <Ionicons name={VENUE_ICON[v] ?? "storefront-outline"} size={18} color={on ? colors.turmeric : colors.ink} />
                <Text style={[styles.venueText, on && { color: colors.white }]} numberOfLines={1}>{v}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {error || loadError ? <Text style={styles.errorText}>{error || loadError}</Text> : null}

      {gridMode ? (
        <View style={styles.sectionRow}>
          <Text style={ui.sectionTitle} numberOfLines={1}>
            {query.trim() ? `Results for "${query.trim()}"` : category !== "All" ? category : "All dishes"}
          </Text>
          <Pressable onPress={() => { setShowAll(false); setQuery(""); clearFilters(); }} hitSlop={8} accessibilityRole="button">
            <Text style={ui.link}>Back to home</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.sectionRow}>
            <Text style={ui.sectionTitle}>Popular near you</Text>
            <Pressable onPress={() => setShowAll(true)} hitSlop={8} accessibilityRole="button" testID="see-all">
              <Text style={ui.link}>See all</Text>
            </Pressable>
          </View>
          {popular.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
              {popular.map((d) => (
                <DishCard key={d.id} variant="grid" width={150} dish={d} merchant={merchantById[d.merchantId]} onPress={() => openDish(d)} onAdd={() => addDish(d)} />
              ))}
            </ScrollView>
          ) : (
            <Text style={[type.bodyMuted, { paddingHorizontal: spacing.lg }]}>No stalls are open right now.</Text>
          )}
          <View style={styles.sectionRow}>
            <Text style={ui.sectionTitle}>Stalls near you</Text>
            <Text style={type.small}>{stalls.filter((m) => m.openNow).length} open now</Text>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        ref={list}
        key={gridMode ? "grid" : "stalls"}
        data={rows}
        keyExtractor={(r) => (r.kind === "stall" ? `m-${r.merchant.id}` : `d-${r.dish.id}`)}
        numColumns={gridMode ? 2 : 1}
        columnWrapperStyle={gridMode ? styles.gridRow : undefined}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        onScrollToIndexFailed={() => {}}
        ListEmptyComponent={
          gridMode ? (
            <EmptyState icon="search-outline" title="No dishes match your search" hint="Try a different search or remove a filter." />
          ) : (
            <EmptyState icon="storefront-outline" title="No stalls here yet" hint={venue ? "Try another category." : "Stalls appear here once they are approved."} />
          )
        }
        renderItem={({ item, index }) => {
          if (item.kind === "stall") {
            return <StallCard merchant={item.merchant} image={stallImage[item.merchant.id]} onPress={() => navigation.navigate("Stall", { merchantId: item.merchant.id })} />;
          }
          const lastAlone = index === rows.length - 1 && rows.length % 2 === 1;
          return (
            <View style={lastAlone ? styles.gridCellAlone : styles.gridCell}>
              <DishCard variant="grid" dish={item.dish} merchant={merchantById[item.dish.merchantId]} onPress={() => openDish(item.dish)} onAdd={() => addDish(item.dish)} />
            </View>
          );
        }}
      />

      {/* Filter sheet: category, diet and dry / wet (FR-1.4). */}
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setFiltersOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={type.h2}>Filters</Text>

            <Text style={styles.sheetLabel}>Category</Text>
            <View style={styles.wrap}>
              {categories.map((c) => {
                const on = c === category;
                return (
                  <Pressable key={c} onPress={() => setCategory(c)} style={[ui.chip, on && ui.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} testID={`category-${c}`}>
                    <Text style={[ui.chipText, on && ui.chipTextOn]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sheetLabel}>Diet</Text>
            <View style={styles.wrap}>
              {DIETARY_FILTERS.map((f) => {
                const on = diet.includes(f.key);
                return (
                  <Pressable key={f.key} onPress={() => toggleDiet(f.key)} style={[ui.chip, on && ui.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`filter-${f.key}`}>
                    <Ionicons name={f.icon as any} size={13} color={on ? colors.white : colors.ink} />
                    <Text style={[ui.chipText, on && ui.chipTextOn]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sheetLabel}>Dry or soup</Text>
            <View style={styles.wrap}>
              {(["dry", "wet"] as const).map((s) => {
                const on = style === s;
                return (
                  <Pressable key={s} onPress={() => setStyle(on ? "" : s)} style={[ui.chip, on && ui.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`filter-${s}`}>
                    <Text style={[ui.chipText, on && ui.chipTextOn]}>{s === "dry" ? "Dry" : "Wet / soup"}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sheetButtons}>
              <Pressable style={[ui.buttonOutline, { flex: 1 }]} onPress={clearFilters} accessibilityRole="button">
                <Text style={ui.buttonOutlineText}>Clear all</Text>
              </Pressable>
              <Pressable style={[ui.buttonAccent, { flex: 1, minHeight: 44 }]} onPress={() => setFiltersOpen(false)} accessibilityRole="button" testID="filters-done">
                <Text style={ui.buttonAccentText}>Show {results.length} {results.length === 1 ? "dish" : "dishes"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={pickAddress} transparent animationType="fade" onRequestClose={() => setPickAddress(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickAddress(false)}>
          <View style={styles.modalCard}>
            <Text style={type.h2}>Deliver to</Text>
            <Text style={[type.bodyMuted, { marginBottom: spacing.sm }]}>Distances to stalls are measured from here.</Text>
            {addresses.length === 0 ? <Text style={type.bodyMuted}>Loading places…</Text> : null}
            {addresses.map((a) => {
              const on = a.line === address.line;
              return (
                <Pressable key={a.line} style={[styles.addrOption, on && styles.addrOptionOn]} onPress={() => { setAddress(a); setPickAddress(false); }} testID={`address-${a.label}`}>
                  <Ionicons name="location" size={16} color={on ? colors.turmericDeep : colors.stone} />
                  <Text style={[type.body, { flex: 1 }]}>{a.line}</Text>
                  {on && <Ionicons name="checkmark" size={16} color={colors.turmericDeep} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const GAP = spacing.md;

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.lg },
  addr: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  addrIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.amberTint, alignItems: "center", justifyContent: "center" },
  addrLabel: { fontFamily: fonts.display, fontSize: 11, color: colors.stoneText },
  addrText: { fontFamily: fonts.displayBold, fontSize: 13.5, color: colors.ink },
  cartBadge: { position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.paper },
  cartBadgeText: { fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink },
  greeting: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, lineHeight: 32 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.paper, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.stoneLine, paddingHorizontal: spacing.lg, minHeight: 46 },
  // On web the browser draws its own focus box inside the pill; the pill itself is the visible field.
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, fontFamily: fonts.serif, color: colors.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  filterBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  filterBadge: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg },
  filterBadgeText: { fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink },
  venueRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingTop: spacing.lg },
  venueTile: { width: 100, minHeight: 64, borderRadius: radius.md, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: spacing.xs },
  venueTileOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  venueText: { fontFamily: fonts.displayBold, fontSize: 11.5, color: colors.ink },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  popularRow: { paddingHorizontal: spacing.lg, gap: GAP, paddingBottom: spacing.xs },
  gridRow: { paddingHorizontal: spacing.lg, gap: GAP, marginBottom: GAP },
  gridCell: { flex: 1 },
  // An odd last dish keeps the same width as the others instead of stretching across.
  gridCellAlone: { flex: 0, width: "50%", paddingRight: GAP / 2 },
  errorText: { color: colors.chiliText, fontFamily: fonts.display, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  list: { paddingBottom: 140 },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.sm, ...shadow.sheet },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.stoneLine, marginBottom: spacing.sm },
  sheetLabel: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink, marginTop: spacing.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sheetButtons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  modalCard: { width: "100%", maxWidth: 400, backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  addrOption: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  addrOptionOn: { borderColor: colors.turmericDeep, backgroundColor: colors.paperDim },
});
