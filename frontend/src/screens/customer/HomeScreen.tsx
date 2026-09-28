import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dishes, merchants, categories } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import DishCard from "../../components/DishCard";
import { colors, radius, spacing, type, fonts, shadow } from "../../theme/theme";

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  All: "flame",
  Noodles: "restaurant",
  Rice: "nutrition",
  Drinks: "cafe",
};

export default function HomeScreen({ navigation, onMenuPress }: any) {
  const { name } = useAuth();
  const { addToCart, itemCount } = useCart();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

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

  const merchantById = useMemo(() => Object.fromEntries(merchants.map((m) => [m.id, m])), []);

  const filtered = useMemo(() => {
    return dishes.filter((d) => {
      const matchesQuery = d.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All" || d.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={[styles.wordmarkRow, { paddingTop: insets.top + spacing.md }]}>
              <Pressable hitSlop={10} onPress={onMenuPress}>
                <Ionicons name="menu" size={24} color={colors.ink} />
              </Pressable>
              {itemCount > 0 ? (
                <Animated.View style={{ transform: [{ scale: cartScale }] }}>
                  <Pressable style={styles.cartPill} onPress={() => navigation.navigate("Cart")}>
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

            <View style={styles.addrRow}>
              <Ionicons name="location" size={15} color={colors.turmericDeep} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addrLabel}>Deliver to</Text>
                <Text style={type.body}>Canteen A, Swinburne Sarawak</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={15} color={colors.paper} style={{ opacity: 0.8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search a dish, e.g. beef noodle"
                placeholderTextColor="#B6AD99"
                value={query}
                onChangeText={setQuery}
              />
            </View>

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
                      <Ionicons
                        name={categoryIcons[item] ?? "fast-food"}
                        size={20}
                        color={active ? colors.white : colors.ink}
                      />
                    </View>
                    <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>{item}</Text>
                  </Pressable>
                );
              }}
            />

            <Text style={styles.sectionTitle}>
              {query ? `Results for "${query}"` : category === "All" ? "Popular now" : category}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={type.body}>No dishes match "{query}"</Text>
            <Text style={type.bodyMuted}>Try a different search or category.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <DishCard
              dish={item}
              merchant={merchantById[item.merchantId]}
              onPress={() => navigation.navigate("DishDetail", { dishId: item.id })}
              onAdd={() => addToCart(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  headlineWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  brand: { fontFamily: fonts.display, fontSize: 12, color: colors.stone, marginBottom: 3 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.herb,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.paper, fontFamily: fonts.displayBold, fontSize: 14 },
  cartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  cartPillText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 12 },
  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.paperDim,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    ...shadow.soft,
  },
  addrLabel: { fontFamily: fonts.display, fontSize: 11, color: colors.stone, marginBottom: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.ink,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 14, fontFamily: fonts.serif, color: colors.paper },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingVertical: spacing.lg },
  tile: { alignItems: "center", width: 56, marginRight: spacing.sm },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.paperDim,
    alignItems: "center",
    justifyContent: "center",
  },
  tileIconActive: { backgroundColor: colors.ink },
  tileLabel: { fontSize: 11, fontFamily: fonts.display, color: colors.stone, marginTop: 6 },
  tileLabelActive: { color: colors.ink },
  sectionTitle: { ...type.h2, fontSize: 17, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  list: { paddingBottom: 140 },
  empty: { alignItems: "center", marginTop: spacing.xxl, gap: 4, paddingHorizontal: spacing.lg },
});
