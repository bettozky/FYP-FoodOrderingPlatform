import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, Animated, Modal, ScrollView } from "react-native";
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
import CategoryGrid, { lookFor, type GridItem } from "../components/CategoryGrid";
import HazeBackground from "../components/HazeBackground";
import WavyGreeting from "../components/WavyGreeting";
import SearchField from "../../../shared/components/SearchField";
import SectionHeader from "../../../shared/components/SectionHeader";
import { MenuButton } from "../../../shared/components/SideDrawer";
import AnnouncementStrip from "../../announcements/AnnouncementStrip";
import { useLive } from "../../ordering/LiveDataContext";
import AddressPicker from "../components/AddressPicker";
import PromoBanner from "../components/PromoBanner";
import CanteenMapCard from "../components/CanteenMapCard";
import LastHourDeals from "../components/LastHourDeals";
import { categoriesFromDishes } from "../categories";
import { colors, layout, radius, spacing, type, shadow, ui, font } from "../../../shared/theme/theme";
import FadeInView from "../../../shared/motion/FadeInView";
import { DishRowSkeleton, DishTileSkeleton } from "../../../shared/motion/Skeleton";

// Home, from Badrul's mock-up (Oct 2026):
// "Deliver to" + cart → "Hi <name>, what are you craving?" → search + filter button
// → amber "How it works" card → colourful icon grid (venues, live map, food types, shortcuts) → "Popular near you" row → stalls near you.
// Typing a search, using the filter sheet or "See all" switches the list to a 2-column grid of dishes.
// Search and filters are answered by the server (FR-1.3, FR-1.4).
const VENUE_ORDER = ["Trending", "Buffet", "Luxury", "Aesthetic Cafe"];

type Row = { kind: "stall"; merchant: Merchant } | { kind: "dish"; dish: Dish };

export default function HomeScreen({ navigation }: any) {
  const { name } = useAuth();
  const { addToCart, itemCount } = useCart();
  const { merchants, merchantById, addresses, address, setAddress, loadError } = useCatalog();
  const liveOn = address.label === "My location";
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<Row>>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [diet, setDiet] = useState<string[]>([]);
  const [style, setStyle] = useState<"" | "dry" | "wet">("");
  const [venue, setVenue] = useState("");
  const [halalOnly, setHalalOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [error, setError] = useState("");
  const [pickAddress, setPickAddress] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const unread = useLive().notifications.length;
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The full menu: categories, stall pictures and "Popular near you" come from it.
  const [menuLoaded, setMenuLoaded] = useState(false);
  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", "/dishes")
      .then((r) => setAllDishes(r.dishes))
      .catch(() => {})
      .finally(() => setMenuLoaded(true));
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

  // "Halal" tile: stalls that put the Halal-friendly tag on themselves (we never decide halal status ourselves).
  const isHalal = (m?: Merchant) => !!m?.tags?.includes("Halal-friendly");
  const inVenue = (merchantId: string) => (!venue || merchantById[merchantId]?.venueCategory === venue) && (!halalOnly || isHalal(merchantById[merchantId]));
  const byOpenThenNear = (a?: Merchant, b?: Merchant) =>
    Number(!!b?.openNow) - Number(!!a?.openNow) || (a?.distanceKm ?? 99) - (b?.distanceKm ?? 99);

  const venues = useMemo(() => {
    const used = new Set(merchants.map((m) => m.venueCategory).filter(Boolean) as string[]);
    return [...VENUE_ORDER.filter((v) => used.has(v)), ...[...used].filter((v) => !VENUE_ORDER.includes(v))];
  }, [merchants]);

  const stalls = useMemo(
    () => merchants.filter((m) => (!venue || m.venueCategory === venue) && (!halalOnly || isHalal(m))).sort(byOpenThenNear),
    [merchants, venue, halalOnly] // eslint-disable-line react-hooks/exhaustive-deps
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
    [allDishes, merchantById, venue, halalOnly] // eslint-disable-line react-hooks/exhaustive-deps
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
  const hasMap = !!navigation.getState?.()?.routeNames?.includes("CanteenMap");

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

  const venueItems = venues.slice(0, 4).map((v): GridItem => ({
    key: `venue-${v}`, label: v === "Aesthetic Cafe" ? "Cafe" : v, ...lookFor(v), hot: v === "Trending", selected: venue === v, onPress: () => setVenue(venue === v ? "" : v),
  }));
  const halalItem: GridItem | null = merchants.some(isHalal)
    ? { key: "halal", label: "Halal", kind: "halal", badge: "NEW", hint: "Halal-friendly stalls", selected: halalOnly, onPress: () => setHalalOnly((on) => !on) }
    : null;
  const gridItems: GridItem[] = [
    ...venueItems.slice(0, 1),
    ...(halalItem ? [halalItem] : []),
    ...venueItems.slice(1),
    // "Live map" appears once the Live Canteen Map branch is merged (route "CanteenMap"); "Jobs" is always there.
    ...(hasMap ? [{ key: "map", label: "Live map", kind: "map", onPress: () => navigation.navigate("CanteenMap") } as GridItem] : []),
    ...categories.filter((c) => c !== "All").slice(0, 8).map((c): GridItem => ({ key: `cat-${c}`, label: c, ...lookFor(c), onPress: () => setCategory(c) })),
    { key: "book", label: "Book table", kind: "book", onPress: () => navigation.navigate("MainTabs", { tab: "book", nonce: Date.now() }) },
    { key: "jobs", label: "Jobs", kind: "jobs", onPress: () => navigation.navigate("Jobs") },
    { key: "saved", label: "Saved", kind: "saved", onPress: () => navigation.navigate("Favourites") },
  ];

  const header = (
    <View>
      {/* Warm turmeric glow behind the top of Home; it fades into the page and scrolls away with the header. */}
      <HazeBackground />
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.sm }]}>
        <MenuButton badge={unread} />
        <Pressable style={({ pressed }) => [styles.addr, pressed && { opacity: 0.6 }]} onPress={() => setPickAddress(true)} testID="address-row" accessibilityRole="button" accessibilityLabel={`Deliver to ${address.line}. Change`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.addrLabel}>Deliver to</Text>
            {liveOn ? <View style={styles.liveChip}><View style={styles.liveDotSm} /><Text style={styles.liveChipText}>Live</Text></View> : null}
          </View>
          <View style={styles.addrLine}>
            <Text style={styles.addrText} numberOfLines={1}>{address.line}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.ink} />
          </View>
        </Pressable>
        <Animated.View style={{ transform: [{ scale: cartScale }] }}>
          <Pressable style={ui.iconButton} onPress={() => navigation.navigate("Cart")} hitSlop={4} testID="cart-pill" accessibilityRole="button" accessibilityLabel={itemCount ? `Cart, ${itemCount} items` : "Cart, empty"}>
            <Ionicons name="bag-handle-outline" size={20} color={colors.ink} />
            {itemCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </View>

      <WavyGreeting name={firstName} />

      <View style={styles.searchRow}>
        <SearchField
          style={styles.searchOnGlow}
          value={query}
          onChangeText={setQuery}
          placeholder="Search dishes or stalls"
          testID="search-input"
        />
        <Pressable style={({ pressed }) => [styles.filterBtn, filterCount ? styles.filterBtnOn : null, pressed && { opacity: 0.7 }]} onPress={() => setFiltersOpen(true)} accessibilityRole="button" accessibilityLabel={filterCount ? `Filters, ${filterCount} on` : "Filters"} testID="filters-button">
          <Ionicons name="options-outline" size={20} color={filterCount ? colors.white : colors.ink} />
          {filterCount ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {!gridMode ? <AnnouncementStrip onOpen={() => navigation.navigate("Announcements")} /> : null}
      {!gridMode ? <PromoBanner onBrowse={browseStalls} /> : null}
      {!gridMode ? <CanteenMapCard merchants={merchants} onPress={() => navigation.navigate("CanteenMap")} /> : null}

      {/* Category panel: cute icons in two rows you swipe sideways (venue types, Halal, live map, food types, shortcuts). */}
      {!gridMode ? <CategoryGrid items={gridItems} /> : null}

      {/* Sprint 3: leftovers at a discount before closing (hidden when no deal is on) */}
      {!gridMode ? <LastHourDeals onOpen={openDish} onAdd={(d, m) => addToCart(d, m)} /> : null}

      {error || loadError ? <Text style={styles.errorText}>{error || loadError}</Text> : null}

      {gridMode ? (
        <SectionHeader
          title={query.trim() ? `Results for "${query.trim()}"` : category !== "All" ? category : "All dishes"}
          action="Done"
          onAction={() => { setShowAll(false); setQuery(""); clearFilters(); }}
        />
      ) : (
        <>
          <SectionHeader title="Popular near you" action="See all" onAction={() => setShowAll(true)} actionTestID="see-all" />
          {!menuLoaded ? (
            <DishTileSkeleton />
          ) : popular.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow} decelerationRate="fast" snapToInterval={POPULAR_W + GAP} snapToAlignment="start">
              {popular.map((d, i) => (
                <FadeInView key={d.id} index={i} from="right">
                  <DishCard variant="grid" width={POPULAR_W} dish={d} merchant={merchantById[d.merchantId]} onPress={() => openDish(d)} onAdd={() => addDish(d)} />
                </FadeInView>
              ))}
            </ScrollView>
          ) : (
            <Text style={[type.bodyMuted, { paddingHorizontal: layout.gutter }]}>No stalls are open right now.</Text>
          )}
          <SectionHeader title="Stalls near you" note={`${stalls.filter((m) => m.openNow).length} open now`} />
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
          ) : merchants.length === 0 && !loadError ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <DishRowSkeleton count={3} />
            </View>
          ) : (
            <EmptyState icon="storefront-outline" title="No stalls here yet" hint={venue ? "Try another category." : "Stalls appear here once they are approved."} />
          )
        }
        renderItem={({ item, index }) => {
          if (item.kind === "stall") {
            return (
              <FadeInView index={index}>
                <StallCard merchant={item.merchant} image={stallImage[item.merchant.id]} onPress={() => navigation.navigate("Stall", { merchantId: item.merchant.id })} />
              </FadeInView>
            );
          }
          const lastAlone = index === rows.length - 1 && rows.length % 2 === 1;
          return (
            <FadeInView index={index} style={lastAlone ? styles.gridCellAlone : styles.gridCell}>
              <DishCard variant="grid" dish={item.dish} merchant={merchantById[item.dish.merchantId]} onPress={() => openDish(item.dish)} onAdd={() => addDish(item.dish)} />
            </FadeInView>
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

      <AddressPicker visible={mapPickerOpen} initial={address} onClose={() => setMapPickerOpen(false)} onConfirm={(a) => { setAddress(a); setMapPickerOpen(false); }} />

      <Modal visible={pickAddress} transparent animationType="fade" onRequestClose={() => setPickAddress(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickAddress(false)}>
          <View style={styles.modalCard}>
            <Text style={type.h2}>Deliver to</Text>
            <Text style={[type.bodyMuted, { marginBottom: spacing.sm }]}>Distances to stalls are measured from here.</Text>
            <Pressable style={styles.mapPickBtn} onPress={() => { setPickAddress(false); setMapPickerOpen(true); }} accessibilityRole="button" testID="home-choose-on-map">
              <Ionicons name="map" size={16} color={colors.paper} />
              <Text style={styles.mapPickText}>Add address</Text>
            </Pressable>
            {addresses.length === 0 ? <Text style={type.bodyMuted}>Loading places…</Text> : null}
            {(address.pinned && !addresses.some((x) => x.line === address.line) ? [address, ...addresses] : addresses).map((a) => {
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
const POPULAR_W = 164;

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: layout.gutter },
  addr: { flex: 1, minWidth: 0, alignItems: "center", gap: 1 },
  addrLabel: { ...font.display, fontSize: 12, color: colors.stoneText },
  addrLine: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.herbLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 },
  liveChipText: { ...font.displayBold, fontSize: 11, color: colors.herb },
  liveDotSm: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.herb },
  mapPickBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.ink, marginBottom: spacing.sm },
  mapPickText: { ...font.displayBold, fontSize: 15, color: colors.paper },
  addrText: { ...font.displayBold, fontSize: 15, color: colors.ink, flexShrink: 1 },
  cartBadge: { position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg },
  cartBadgeText: { ...font.displayBold, fontSize: 11, color: colors.ink, fontVariant: ["tabular-nums"] },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: layout.gutter, marginTop: spacing.lg },
  searchOnGlow: { flex: 1, backgroundColor: colors.paper, ...shadow.soft },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", ...shadow.soft },
  filterBtnOn: { backgroundColor: colors.ink },
  filterBadge: { position: "absolute", top: -5, right: -5, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bg },
  filterBadgeText: { ...font.displayBold, fontSize: 11, color: colors.ink },
  popularRow: { paddingHorizontal: layout.gutter, gap: GAP, paddingBottom: spacing.xs },
  gridRow: { paddingHorizontal: layout.gutter, gap: GAP, marginBottom: GAP },
  gridCell: { flex: 1 },
  // An odd last dish keeps the same width as the others instead of stretching across.
  gridCellAlone: { flex: 0, width: "50%", paddingRight: GAP / 2 },
  errorText: { color: colors.chiliText, ...font.display, fontSize: 14, paddingHorizontal: layout.gutter, marginTop: spacing.md },
  list: { paddingBottom: layout.tabBarClearance },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingTop: spacing.md, gap: spacing.sm, ...shadow.sheet },
  sheetHandle: { alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: colors.stoneSoft, marginBottom: spacing.md },
  sheetLabel: { ...font.displayBold, fontSize: 15, color: colors.ink, marginTop: spacing.lg },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sheetButtons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  modalCard: { width: "100%", maxWidth: 400, backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  addrOption: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine },
  addrOptionOn: { borderColor: colors.ink, backgroundColor: colors.paperDim },
});
