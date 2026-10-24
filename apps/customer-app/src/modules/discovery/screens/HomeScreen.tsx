import React, { useEffect, useRef, useState } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, Animated, Modal, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorText } from "../../../shared/api/client";
import { Dish } from "../../../shared/api/types";
import { DIETARY_FILTERS } from "../../../shared/data/mockData";
import { useAuth } from "../../auth/AuthContext";
import { useCart } from "../../ordering/CartContext";
import { useCatalog } from "../CatalogContext";
import DishCard from "../components/DishCard";
import { categoriesFromDishes } from "../categories";
import PromoBanner from "../components/PromoBanner";
import { colors, radius, spacing, type, fonts, shadow } from "../../../shared/theme/theme";

// Icons for the categories shops use most; any other category gets the generic fast-food icon.
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  All: "flame",
  Noodles: "restaurant",
  Rice: "nutrition",
  Drinks: "cafe",
  Dessert: "ice-cream",
  Desserts: "ice-cream",
  Breakfast: "sunny",
  Snacks: "pizza",
  Western: "fast-food",
};

export default function HomeScreen({ navigation, onMenuPress }: any) {
  const { name } = useAuth();
  const { addToCart, itemCount } = useCart();
  const { merchantById, addresses, address, setAddress, loadError } = useCatalog();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [diet, setDiet] = useState<string[]>([]);
  const [style, setStyle] = useState<"" | "dry" | "wet">("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [error, setError] = useState("");
  const [pickAddress, setPickAddress] = useState(false);
  const [categories, setCategories] = useState<string[]>(["All"]);

  // Category chips come from the whole menu, so they do not change while searching or filtering.
  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", "/dishes").then((r) => setCategories(categoriesFromDishes(r.dishes))).catch(() => {});
  }, []);
  // If a category disappears (e.g. its last dish was removed), fall back to All.
  useEffect(() => {
    if (!categories.includes(category)) setCategory("All");
  }, [categories, category]);

  const cartScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(itemCount);
  useEffect(() => {
    if (itemCount > prevCount.current) {
      cartScale.setValue(1);
      Animated.sequence([
        Animated.spring(cartScale, { toValue: 1.35, speed: 40, bounciness: 14, useNativeDriver: true }),
        Animated.spring(cartScale, { toValue: 1, speed: 30, bounciness: 10, useNativeDriver: true }),
      ]).start();
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  // FR-1.3 search + FR-1.4 dietary / dry-or-wet filters, all answered by the server.
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

  // Open stalls first, then nearest first.
  const shown = dishes
    .filter((d) => category === "All" || d.category === category)
    .sort((a, b) => {
      const ma = merchantById[a.merchantId], mb = merchantById[b.merchantId];
      const oa = ma?.openNow ? 0 : 1, ob = mb?.openNow ? 0 : 1;
      return oa - ob || (ma?.distanceKm ?? 99) - (mb?.distanceKm ?? 99) || Number(a.soldOut) - Number(b.soldOut);
    });

  const toggleDiet = (k: string) => setDiet((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={shown}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={[styles.wordmarkRow, { paddingTop: insets.top + spacing.md }]}>
              <Pressable hitSlop={10} onPress={onMenuPress}>
                <Ionicons name="menu" size={24} color={colors.ink} />
              </Pressable>
              {itemCount > 0 ? (
                <Animated.View style={{ transform: [{ scale: cartScale }] }}>
                  <Pressable style={styles.cartPill} onPress={() => navigation.navigate("Cart")} testID="cart-pill">
                    <Ionicons name="bag-handle" size={13} color={colors.white} />
                    <Text style={styles.cartPillText}>{itemCount}</Text>
                  </Pressable>
                </Animated.View>
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(name || "S")[0].toUpperCase()}</Text>
                </View>
              )}
            </View>

            <View style={styles.headlineWrap}>
              <Text style={type.h1}>
                Good food.{"\n"}Fast delivery.
              </Text>
              <Text style={styles.brand}>
                ScootMeal<Text style={{ color: colors.turmeric }}>.</Text>
              </Text>
            </View>

            <Pressable style={styles.addrRow} onPress={() => setPickAddress(true)} testID="address-row">
              <Ionicons name="location" size={15} color={colors.turmericDeep} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addrLabel}>Ordering near</Text>
                <Text style={type.body}>{address.line}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={15} color={colors.paper} style={{ opacity: 0.8 }} />
              <TextInput
                style={styles.searchInput}
                accessibilityLabel="Search dishes"
                placeholder="Search a dish, e.g. beef noodle"
                placeholderTextColor="#B6AD99"
                value={query}
                onChangeText={setQuery}
                testID="search-input"
              />
            </View>

            <PromoBanner />

            <FlatList
              horizontal
              data={categories}
              keyExtractor={(c) => c}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              renderItem={({ item }) => {
                const active = item === category;
                return (
                  <Pressable onPress={() => setCategory(item)} style={styles.tile}>
                    <View style={[styles.tileIcon, active && styles.tileIconActive, shadow.soft]}>
                      <Ionicons name={categoryIcons[item] ?? "fast-food"} size={20} color={active ? colors.white : colors.ink} />
                    </View>
                    <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>{item}</Text>
                  </Pressable>
                );
              }}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {DIETARY_FILTERS.map((f) => {
                const on = diet.includes(f.key);
                return (
                  <Pressable key={f.key} onPress={() => toggleDiet(f.key)} style={[styles.filterChip, on && styles.filterChipOn]} testID={`filter-${f.key}`}>
                    <Ionicons name={f.icon as any} size={13} color={on ? colors.white : colors.ink} />
                    <Text style={[styles.filterText, on && { color: colors.white }]}>{f.label}</Text>
                  </Pressable>
                );
              })}
              {(["dry", "wet"] as const).map((s) => {
                const on = style === s;
                return (
                  <Pressable key={s} onPress={() => setStyle(on ? "" : s)} style={[styles.filterChip, on && styles.filterChipOn]} testID={`filter-${s}`}>
                    <Ionicons name={s === "dry" ? "sunny" : "water"} size={13} color={on ? colors.white : colors.ink} />
                    <Text style={[styles.filterText, on && { color: colors.white }]}>{s === "dry" ? "Dry" : "Wet / soup"}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {query ? `Results for "${query}"` : category === "All" ? "Popular now" : category}
            </Text>
            {error || loadError ? <Text style={styles.errorText}>{error || loadError}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="search-outline" title="No dishes match your search" hint="Try a different search or remove a filter." />
        }
        renderItem={({ item }) => {
          const m = merchantById[item.merchantId];
          return (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <DishCard
                dish={item}
                merchant={m}
                onPress={() => navigation.navigate("DishDetail", { dishId: item.id })}
                onAdd={m ? () => addToCart(item, m) : undefined}
              />
            </View>
          );
        }}
      />

      <Modal visible={pickAddress} transparent animationType="fade" onRequestClose={() => setPickAddress(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickAddress(false)}>
          <View style={styles.modalCard}>
            <Text style={type.h2}>Ordering near</Text>
            <Text style={[type.bodyMuted, { marginBottom: spacing.sm }]}>Distances to restaurants are measured from here.</Text>
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

const styles = StyleSheet.create({
  wordmarkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  headlineWrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: spacing.lg, marginTop: spacing.md },
  brand: { fontFamily: fonts.display, fontSize: 12, color: colors.stone, marginBottom: 3 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.herb, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.paper, fontFamily: fonts.displayBold, fontSize: 14 },
  cartPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.ink, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  cartPillText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 12 },
  addrRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.paperDim, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, ...shadow.soft },
  addrLabel: { fontFamily: fonts.display, fontSize: 11, color: colors.stone, marginBottom: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.ink, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.md, ...shadow.card },
  // On web the browser draws its own focus box inside the dark pill; the pill itself is the visible field.
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 14, fontFamily: fonts.serif, color: colors.paper, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  tile: { alignItems: "center", width: 56, marginRight: spacing.sm },
  tileIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  tileIconActive: { backgroundColor: colors.ink },
  tileLabel: { fontSize: 11, fontFamily: fonts.display, color: colors.stone, marginTop: 6 },
  tileLabelActive: { color: colors.ink },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg, paddingTop: spacing.xs },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  filterChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  sectionTitle: { ...type.h2, fontSize: 17, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  errorText: { color: colors.chili, fontFamily: fonts.display, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  list: { paddingBottom: 140 },
  empty: { alignItems: "center", marginTop: spacing.xxl, gap: 4, paddingHorizontal: spacing.lg },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  modalCard: { width: "100%", maxWidth: 400, backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  addrOption: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  addrOptionOn: { borderColor: colors.turmericDeep, backgroundColor: colors.paperDim },
});
