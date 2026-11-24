import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { api, errorText } from "../../shared/api/client";
import { Dish } from "../../shared/api/types";
import EmptyState from "../../shared/components/EmptyState";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { Pressable } from "react-native";
import { colors, spacing, type, layout } from "../../shared/theme/theme";
import { useCart } from "../ordering/CartContext";
import DishCard from "../discovery/components/DishCard";
import { useCatalog } from "../discovery/CatalogContext";
import { useFavourites } from "./FavouritesContext";
import { useTranslation } from "react-i18next";

// "Saved dishes" (inspired by the wireframes' Favourites screen). Dishes are re-fetched each time
// so sold-out / closed status is current instead of a stale copy.
export default function FavouritesScreen({ navigation }: any) {
  const { ids, shopIds } = useFavourites();
  const { t } = useTranslation();
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
      <ScreenHeader title={t("menu.savedDishes")} subtitle={t("saved.subtitle")} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {dishes === null && !error ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.ink} accessibilityLabel={t("saved.loading")} />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            shopIds.length ? (
              <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
                <Text style={type.h3}>{t("saved.stalls")}</Text>
                {shopIds.map((id) => merchantById[id]).filter(Boolean).map((m) => (
                  <Pressable key={m.id} style={styles.shop} onPress={() => navigation.navigate("Stall", { merchantId: m.id })} accessibilityRole="button" testID={`saved-stall-${m.id}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3}>{m.name}</Text>
                      <Text style={type.small}>{m.rating.toFixed(1)}★ · {m.openNow ? t("stall.open") : t("stall.closed")} · {m.stallNo}</Text>
                    </View>
                  </Pressable>
                ))}
                {saved.length ? <Text style={[type.h3, { marginTop: spacing.sm }]}>{t("menu.savedDishes")}</Text> : null}
              </View>
            ) : undefined
          }
          ListEmptyComponent={<EmptyState icon="heart-outline" title={t("saved.none")} hint={t("saved.noneHint")} />}
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
  list: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xxl },
  shop: { flexDirection: "row", alignItems: "center", backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.stoneLine, padding: spacing.md },
  error: { color: colors.chiliText, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
});
