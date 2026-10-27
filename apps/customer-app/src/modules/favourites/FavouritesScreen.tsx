import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { api, errorText } from "../../shared/api/client";
import { Dish } from "../../shared/api/types";
import EmptyState from "../../shared/components/EmptyState";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { colors, spacing } from "../../shared/theme/theme";
import { useCart } from "../ordering/CartContext";
import DishCard from "../discovery/components/DishCard";
import { useCatalog } from "../discovery/CatalogContext";
import { useFavourites } from "./FavouritesContext";

// "Saved dishes" (inspired by the wireframes' Favourites screen). Dishes are re-fetched each time
// so sold-out / closed status is current instead of a stale copy.
export default function FavouritesScreen({ navigation }: any) {
  const { ids } = useFavourites();
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
      <ScreenHeader title="Saved dishes" subtitle="Tap the heart on any dish to save it here." />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {dishes === null && !error ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.ink} accessibilityLabel="Loading saved dishes" />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="heart-outline" title="No saved dishes yet" hint="Tap the heart on a dish to keep it here for later." />}
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
  error: { color: colors.chiliText, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
});
