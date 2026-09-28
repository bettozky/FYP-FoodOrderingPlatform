import React, { useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, Pressable } from "react-native";
import { dishes, merchants, categories } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import DishCard from "../../components/DishCard";
import { colors, radius, spacing, type } from "../../theme/theme";

export default function HomeScreen({ navigation }: any) {
  const { name } = useAuth();
  const { addToCart, itemCount } = useCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

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
      <View style={styles.header}>
        <View>
          <Text style={type.bodyMuted}>Hey {name || "there"} 👋</Text>
          <Text style={type.h1}>What are you craving?</Text>
        </View>
        {itemCount > 0 && (
          <Pressable style={styles.cartPill} onPress={() => navigation.navigate("Cart")}>
            <Text style={styles.cartPillText}>🛒 {itemCount}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search a dish, e.g. beef noodles"
          placeholderTextColor={colors.textFaint}
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
            <Pressable
              onPress={() => setCategory(item)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={type.body}>No dishes match "{query}"</Text>
            <Text style={type.bodyMuted}>Try a different search or category.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <DishCard
            dish={item}
            merchant={merchantById[item.merchantId]}
            onPress={() => navigation.navigate("DishDetail", { dishId: item.id })}
            onAdd={() => addToCart(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  cartPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  cartPillText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 14, marginRight: spacing.sm },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  chipTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: "center", marginTop: spacing.xxl, gap: 4 },
});
