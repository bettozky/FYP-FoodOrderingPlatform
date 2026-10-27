import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Animated, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../shared/api/client";
import { Dish } from "../../../shared/api/types";
import { useCart } from "../../ordering/CartContext";
import { useCatalog } from "../CatalogContext";
import { useFavourites } from "../../favourites/FavouritesContext";
import DishImage from "../../../shared/components/DishImage";
import { colors, radius, spacing, type, fonts, ui } from "../../../shared/theme/theme";

// Dish detail, from Badrul's mock-up (Oct 2026):
// back · stall name (opens the stall menu) · cart → big round picture → name, description, price
// → "Per dish · delivery fee added at checkout" → chips (wet/dry, prep time, rating) → allergen note
// → Customise chips → bottom bar with the qty stepper and "Add to cart · RM".
// Dine-in / takeaway / delivery is chosen per dish in the cart, so it is not asked here.
export default function DishDetailScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { dishId } = route.params;
  const { merchantById } = useCatalog();
  const { addToCart, itemCount } = useCart();
  const [dish, setDish] = useState<Dish | null>(null);
  const [missing, setMissing] = useState(false);
  const [rating, setRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });
  const [qty, setQty] = useState(1);
  const [options, setOptions] = useState<string[]>([]);
  const { isFav, toggle } = useFavourites();
  const fav = isFav(dishId);
  const [justAdded, setJustAdded] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", "/dishes")
      .then((r) => {
        const d = r.dishes.find((x) => x.id === dishId) ?? null;
        setDish(d);
        setMissing(!d);
      })
      .catch(() => setMissing(true));
    api<{ average: number | null; count: number }>("GET", `/dishes/${dishId}/reviews`).then(setRating).catch(() => {});
  }, [dishId]);

  const merchant = dish ? merchantById[dish.merchantId] : undefined;

  if (!dish || !merchant) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {missing ? (
          <>
            <Text style={type.h3}>This dish isn't available any more.</Text>
            <Pressable style={[ui.buttonDark, { marginTop: spacing.md }]} onPress={() => navigation.goBack()}>
              <Text style={ui.buttonDarkText}>Go back</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.ink} />
        )}
      </View>
    );
  }
  const unavailable = dish.soldOut || !merchant.openNow;

  async function handleAdd() {
    if (!dish || !merchant) return;
    const ok = await addToCart(dish, merchant, { qty, options });
    if (!ok) return;
    setJustAdded(true);
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.05, speed: 50, bounciness: 10, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, speed: 30, bounciness: 8, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      navigation.navigate("Cart");
      setJustAdded(false);
    }, 450);
  }

  const chips = [
    dish.style ? (dish.style === "dry" ? "Dry" : "Wet / soup") : null,
    `${merchant.prepMinutes} min prep`,
    rating.average !== null ? `${rating.average}★` : `${merchant.rating.toFixed(1)}★`,
    dish.dietary.includes("spicy") ? "Spicy" : null,
    dish.dietary.includes("vegetarian") ? "Vegetarian" : null,
    dish.dietary.includes("plant_based") ? "Plant-based" : null,
    merchant.tags.includes("Halal-friendly") ? "Halal-friendly" : null,
  ].filter(Boolean) as string[];

  const toggleOption = (c: string) => setOptions((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"))} hitSlop={8} style={ui.iconButton} accessibilityRole="button" accessibilityLabel="Go back" testID="back">
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Pressable style={styles.headerTitle} onPress={() => navigation.navigate("Stall", { merchantId: merchant.id })} accessibilityRole="link" accessibilityLabel={`See the menu of ${merchant.name}`} testID="open-stall">
          <Text style={styles.headerText} numberOfLines={1}>{merchant.name}</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={() => toggle(dishId)} hitSlop={8} style={ui.iconButton} accessibilityRole="button" accessibilityLabel={fav ? "Remove from saved dishes" : "Save this dish"} testID="fav">
            <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? colors.chili : colors.ink} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Cart")} hitSlop={8} style={ui.iconButton} accessibilityRole="button" accessibilityLabel={itemCount ? `Cart, ${itemCount} items` : "Cart, empty"}>
            <Ionicons name="bag-handle-outline" size={18} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 110 + insets.bottom }]}>
        <DishImage image={dish.image} size={200} shape="circle" label={dish.name} overlay={dish.soldOut ? "Sold out" : undefined} style={styles.picture} />

        <Text style={[type.h1, styles.centerText, { marginTop: spacing.lg }]} accessibilityRole="header">{dish.name}</Text>
        {dish.description ? <Text style={[styles.desc, styles.centerText]}>{dish.description}</Text> : null}
        <Text style={[ui.priceLarge, styles.centerText, { marginTop: spacing.sm }]}>RM {dish.price.toFixed(2)}</Text>
        <Text style={[type.small, styles.centerText]}>Per dish · delivery fee added at checkout</Text>

        <View style={styles.chips}>
          {chips.map((c) => (
            <View key={c} style={[ui.infoChip, c.endsWith("★") && { backgroundColor: colors.amberTint }]}>
              <Text style={ui.infoChipText}>{c}</Text>
            </View>
          ))}
        </View>

        {!merchant.openNow ? (
          <View style={[styles.note, styles.noteClosed]}>
            <Ionicons name="moon-outline" size={15} color={colors.chiliText} />
            <Text style={[styles.noteText, { color: colors.chiliText }]}>{merchant.name} is closed right now (opens {merchant.hours.open}), so you can't order yet.</Text>
          </View>
        ) : null}
        <View style={styles.note}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.stoneText} />
          <Text style={styles.noteText}>
            Allergen information is unverified. Check with the stall.{merchant.dineInOnly ? " This stall is dine-in only right now." : ""}
          </Text>
        </View>

        {!unavailable && dish.customisations.length > 0 ? (
          <>
            <Text style={[ui.sectionTitle, styles.section]}>Customise</Text>
            <View style={styles.optionWrap}>
              {dish.customisations.map((c) => {
                const on = options.includes(c);
                return (
                  <Pressable key={c} onPress={() => toggleOption(c)} style={[ui.chip, on && ui.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`option-${c}`}>
                    <Text style={[ui.chipText, on && ui.chipTextOn]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {!unavailable ? (
          <View style={ui.stepper}>
            <Pressable style={ui.stepperButton} onPress={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} accessibilityRole="button" accessibilityLabel="One less" testID="qty-minus">
              <Ionicons name="remove" size={17} color={qty <= 1 ? colors.stoneSoft : colors.ink} />
            </Pressable>
            <Text style={ui.stepperValue} accessibilityLabel={`Quantity ${qty}`}>{qty}</Text>
            <Pressable style={ui.stepperButton} onPress={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20} accessibilityRole="button" accessibilityLabel="One more" testID="qty-plus">
              <Ionicons name="add" size={17} color={qty >= 20 ? colors.stoneSoft : colors.ink} />
            </Pressable>
          </View>
        ) : null}
        <Animated.View style={{ flex: 1, transform: [{ scale: btnScale }] }}>
          <Pressable
            style={[ui.buttonAccent, unavailable && styles.buttonOff, justAdded && { backgroundColor: colors.herb }]}
            onPress={handleAdd}
            disabled={unavailable}
            accessibilityRole="button"
            accessibilityState={{ disabled: unavailable }}
            testID="add-to-cart"
          >
            <Text style={[ui.buttonAccentText, unavailable && { color: colors.stoneText }, justAdded && { color: colors.white }]} numberOfLines={1}>
              {dish.soldOut ? "Sold out" : !merchant.openNow ? "Stall is closed" : justAdded ? "Added ✓" : `Add to cart · RM ${(dish.price * qty).toFixed(2)}`}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerTitle: { flex: 1, alignItems: "center", minHeight: 38, justifyContent: "center" },
  headerText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  headerRight: { flexDirection: "row", gap: spacing.sm },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  picture: { alignSelf: "center", marginTop: spacing.md },
  centerText: { textAlign: "center" },
  desc: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, color: colors.stoneText, marginTop: spacing.xs, paddingHorizontal: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md },
  note: { ...ui.card, flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", padding: spacing.md, marginTop: spacing.lg },
  noteClosed: { backgroundColor: colors.chiliSoft, borderColor: colors.chiliBorder },
  noteText: { flex: 1, fontFamily: fonts.display, fontSize: 12, lineHeight: 17, color: colors.stoneText },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.stoneLine, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  buttonOff: { backgroundColor: colors.paperDim },
});
