import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { api, errorText } from "../../shared/api/client";
import { Dish } from "../../shared/api/types";
import EmptyState from "../../shared/components/EmptyState";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { Pressable } from "react-native";
import { colors, spacing, type } from "../../shared/theme/theme";
import { useCart } from "../ordering/CartContext";
import DishCard from "../discovery/components/DishCard";
import { useCatalog } from "../discovery/CatalogContext";
import { useFavourites } from "./FavouritesContext";

// "Saved dishes" (inspired by the wireframes' Favourites screen). Dishes are re-fetched each time
// so sold-out / closed status is current instead of a stale copy.
export default function FavouritesScreen({ navigation }: any) {
  const { ids, shopIds } = useFavourites();
  const { merchantById } = useCatalog();
  const { addToCart } = useCart();
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", "/dishes")
      .then((r) => {
        setDishes(r.dishes);
        setError("");
      })
      .catch((e) => setError(errorText(e)));
  }, []);

  const saved = (dishes ?? []).filter((d) => ids.includes(d.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Saved dishes" subtitle="Tap the heart on any dish or stall to save it here." />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {dishes === null && !error ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.ink} accessibilityLabel="Loading saved dishes" />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            shopIds.length ? (
              <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
                <Text style={type.h3}>Saved stalls</Text>
                {shopIds.map((id) => merchantById[id]).filter(Boolean).map((m) => (
                  <Pressable key={m.id} style={styles.shop} onPress={() => navigation.navigate("Stall", { merchantId: m.id })} accessibilityRole="button" testID={`saved-stall-${m.id}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3}>{m.name}</Text>
                      <Text style={type.small}>{m.rating.toFixed(1)}★ · {m.openNow ? "Open" : "Closed"} · {m.stallNo}</Text>
                    </View>
                  </Pressable>
                ))}
                {saved.length ? <Text style={[type.h3, { marginTop: spacing.sm }]}>Saved dishes</Text> : null}
              </View>
            ) : undefined
          }
          ListEmptyComponent={<EmptyState icon="heart-outline" title="No saved dishes yet" hint="Tap the heart on a dish or stall to keep it here for later." />}
          renderItem={({ item }) => {
            const m = merchantById[item.merchantId];
            return (
              <DishCard
                showSave
                dish={item}
                merchant={m}
                onPress={() => navigation.navigate("DishDetail", { dishId: item.id })}
                onAdd={m ? () => addToCart(item, m) : undefined}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  shop: { flexDirection: "row", alignItems: "center", backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.stoneLine, padding: spacing.md },
  error: { color: colors.chiliText, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
});
