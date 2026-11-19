import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../shared/api/client";
import { Dish, Merchant } from "../../../shared/api/types";
import { useCart } from "../../ordering/CartContext";
import { useCatalog } from "../CatalogContext";
import { useFavourites } from "../../favourites/FavouritesContext";
import ReviewsList from "../../reviews/ReviewsList";
import DishImage from "../../../shared/components/DishImage";
import ReadyChip from "../components/ReadyChip";
import { Price } from "../components/DishCard";
import { EndsChip } from "../components/LastHourDeals";
import { colors, layout, spacing, type, ui, font } from "../../../shared/theme/theme";
import PressableScale from "../../../shared/motion/PressableScale";
import FadeInView from "../../../shared/motion/FadeInView";
import { PopOnChange } from "../../../shared/motion/PulseRing";
import { Skeleton } from "../../../shared/motion/Skeleton";
import { dietFit } from "../../diet/diet";
import { useDiet } from "../../diet/useDiet";

// Dish detail, from Badrul's mock-up (Oct 2026):
// back · stall name (opens the stall menu) · cart → big round picture → name, description, price
// → "Per dish · delivery fee added at checkout" → chips (wet/dry, prep time, rating) → allergen note
// → Customise chips → bottom bar with the qty stepper and "Add to cart · RM".
// Dine-in / takeaway / delivery is chosen per dish in the cart, so it is not asked here.
/**
 * The allergen line under the dish. It only repeats what the stall told us and never calls a dish "safe":
 * a dish with no allergens listed may still have them, so the customer is always told to check if it is serious.
 */
function allergenNote(dish: Dish, merchant: Merchant): string {
  if (dish.allergens?.length) return "Listed by the stall. If your allergy is serious, check with them before ordering.";
  if (merchant.allergens?.length) return `No allergens listed for this dish, but this kitchen uses ${merchant.allergens.join(", ")}. If your allergy is serious, check with the stall.`;
  if (merchant.allergens) return "The stall says none of the 9 common allergens are used in its kitchen. If your allergy is serious, check with them.";
  return "This stall has not listed its allergens. Check with the stall.";
}

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
  const { diet } = useDiet(); // Sprint 3 diet profile

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
          // Loading: the shape of the page (round picture, name, price) instead of a spinner.
          <View style={styles.loading} accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
            <Skeleton width={200} height={200} rounded={100} />
            <Skeleton width="60%" height={24} />
            <Skeleton width="80%" height={12} />
            <Skeleton width={110} height={26} />
          </View>
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
    rating.average !== null ? `${rating.average}★` : `${merchant.rating.toFixed(1)}★`,
    dish.dietary.includes("spicy") ? "Spicy" : null,
    dish.dietary.includes("vegetarian") ? "Vegetarian" : null,
    dish.dietary.includes("plant_based") ? "Plant-based" : null,
    merchant.tags.includes("Halal-friendly") ? "Halal-friendly" : null,
  ].filter(Boolean) as string[];

  const toggleOption = (c: string) => setOptions((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Pressable onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"))} hitSlop={4} style={ui.iconButton} accessibilityRole="button" accessibilityLabel="Go back" testID="back">
          <Ionicons name="chevron-back" size={22} color={colors.ink} style={{ marginLeft: -2 }} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={() => toggle(dishId)} hitSlop={8} style={ui.iconButton} accessibilityRole="button" accessibilityLabel={fav ? "Remove from saved dishes" : "Save this dish"} testID="fav">
            <PopOnChange trigger={fav}>
              <Ionicons name={fav ? "heart" : "heart-outline"} size={20} color={fav ? colors.chili : colors.ink} />
            </PopOnChange>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Cart")} hitSlop={8} style={ui.iconButton} accessibilityRole="button" accessibilityLabel={itemCount ? `Cart, ${itemCount} items` : "Cart, empty"}>
            <Ionicons name="bag-handle-outline" size={20} color={colors.ink} />
            {itemCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <FadeInView distance={0} duration={280}>
          <DishImage image={dish.image} shape="hero" label={dish.name} overlay={dish.soldOut ? "Sold out" : undefined} style={styles.picture} />
        </FadeInView>

        <View style={styles.body}>
        <Text style={[type.h1, { fontSize: 28, lineHeight: 34 }]} accessibilityRole="header">{dish.name}</Text>
        <Pressable style={({ pressed }) => [styles.stallLink, pressed && { opacity: 0.6 }]} onPress={() => navigation.navigate("Stall", { merchantId: merchant.id })} hitSlop={6} accessibilityRole="link" accessibilityLabel={`See the menu of ${merchant.name}`} testID="open-stall">
          <Text style={styles.stallLinkText} numberOfLines={1}>{merchant.name}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.amberText} />
        </Pressable>
        {dish.description ? <Text style={styles.desc}>{dish.description}</Text> : null}
        <View style={{ marginTop: spacing.lg, gap: 6 }}>
          <Price dish={dish} large />
          {dish.dealPercent ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} testID="deal-detail">
              <Text style={{ ...font.displayExtraBold, fontSize: 12, color: colors.chiliText }}>Last-hour deal · {dish.dealPercent}% off</Text>
              <EndsChip endsAt={dish.dealEndsAt} />
            </View>
          ) : null}
        </View>
        <Text style={[type.small, { marginTop: 2 }]}>Per dish · delivery fee added at checkout</Text>

        <View style={styles.chips}>
          <ReadyChip merchant={merchant} />
          {chips.map((c) => (
            <View key={c} style={ui.infoChip}>
              {c.endsWith("★") ? <Ionicons name="star" size={12} color={colors.turmericDeep} /> : null}
              <Text style={ui.infoChipText}>{c.endsWith("★") ? c.slice(0, -1) : c}</Text>
            </View>
          ))}
        </View>

        <DietBanner fit={dietFit(dish, merchant, diet)} onEdit={() => navigation.navigate("Diet")} />
        {!merchant.openNow ? (
          <View style={[styles.note, styles.noteClosed]}>
            <Ionicons name="moon-outline" size={18} color={colors.chiliText} />
            <Text style={[styles.noteText, { color: colors.chiliText }]}>{merchant.name} is closed right now (opens {merchant.hours.open}), so you can't order yet.</Text>
          </View>
        ) : null}
        <View style={[styles.note, dish.allergens?.length ? styles.noteAllergen : null]} testID="allergen-note">
          <Ionicons name="alert-circle-outline" size={18} color={dish.allergens?.length ? colors.amberText : colors.stoneText} />
          <View style={{ flex: 1, gap: 2 }}>
            {dish.allergens?.length ? <Text style={styles.noteTitle}>Contains: {dish.allergens.join(", ")}</Text> : null}
            <Text style={styles.noteText}>
              {allergenNote(dish, merchant)}{merchant.dineInOnly ? " This stall is dine-in only right now." : ""}
            </Text>
          </View>
        </View>

        {!unavailable && dish.customisations.length > 0 ? (
          <>
            <Text style={[ui.sectionTitle, styles.section]}>Customise</Text>
            <View style={styles.optionWrap}>
              {dish.customisations.map((c) => {
                const on = options.includes(c);
                return (
                  <PressableScale key={c} onPress={() => toggleOption(c)} style={[ui.chip, on && ui.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`option-${c}`}>
                    <Text style={[ui.chipText, on && ui.chipTextOn]}>{c}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={[ui.sectionTitle, styles.section]}>Reviews</Text>
        <ReviewsList dishId={dishId} showDish={false} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {!unavailable ? (
          <View style={ui.stepper}>
            <PressableScale scaleTo={0.85} style={ui.stepperButton} onPress={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} accessibilityRole="button" accessibilityLabel="One less" testID="qty-minus">
              <Ionicons name="remove" size={18} color={qty <= 1 ? colors.stoneSoft : colors.ink} />
            </PressableScale>
            <PopOnChange trigger={qty}>
              <Text style={ui.stepperValue} accessibilityLabel={`Quantity ${qty}`}>{qty}</Text>
            </PopOnChange>
            <PressableScale scaleTo={0.85} style={ui.stepperButton} onPress={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20} accessibilityRole="button" accessibilityLabel="One more" testID="qty-plus">
              <Ionicons name="add" size={18} color={qty >= 20 ? colors.stoneSoft : colors.ink} />
            </PressableScale>
          </View>
        ) : null}
        <Animated.View style={{ flex: 1, transform: [{ scale: btnScale }] }}>
          <PressableScale
            style={[ui.buttonAccent, unavailable && styles.buttonOff, justAdded && { backgroundColor: colors.herb }]}
            onPress={handleAdd}
            disabled={unavailable}
            accessibilityRole="button"
            accessibilityState={{ disabled: unavailable }}
            testID="add-to-cart"
          >
            <Text style={[ui.buttonAccentText, unavailable && { color: colors.stoneText }, justAdded && { color: colors.white }]} numberOfLines={1}>
              {dish.soldOut ? "Sold out" : !merchant.openNow ? "Stall is closed" : justAdded ? "Added to cart" : `Add to cart · RM ${(dish.price * qty).toFixed(2)}`}
            </Text>
          </PressableScale>
        </Animated.View>
      </View>
    </View>
  );
}

/** Sprint 3 diet profile: red "Not for you" or amber "Ask the stall" at the top of the dish, from the saved profile. */
function DietBanner({ fit, onEdit }: { fit: ReturnType<typeof dietFit>; onEdit: () => void }) {
  if (fit.level === "ok") return null;
  const avoid = fit.level === "avoid";
  return (
    <View style={[styles.note, { backgroundColor: avoid ? colors.chiliSoft : colors.amberTint }]} testID="diet-banner" accessibilityRole="alert">
      <Ionicons name={avoid ? "warning-outline" : "help-circle-outline"} size={18} color={avoid ? colors.chiliText : colors.amberText} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.noteTitle, { color: avoid ? colors.chiliText : colors.amberText }]}>
          {avoid ? "Doesn't fit your diet profile" : "Check with the stall first"}
        </Text>
        <Text style={styles.noteText}>{fit.reasons.join(" · ")}</Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit my diet profile">
        <Text style={[styles.noteTitle, { color: colors.amberText }]}>Edit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  loading: { width: "100%", alignItems: "center", gap: spacing.md },
  // Back / save / cart float over the photo.
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: layout.gutter },
  headerRight: { flexDirection: "row", gap: spacing.sm },
  cartBadge: { position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.paper },
  cartBadgeText: { ...font.displayBold, fontSize: 11, color: colors.ink },
  picture: { width: "100%", aspectRatio: 1.25 },
  body: { paddingHorizontal: layout.gutter, paddingTop: spacing.xl },
  stallLink: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", marginTop: spacing.xs, minHeight: 28 },
  stallLinkText: { ...font.displayBold, fontSize: 15, color: colors.amberText },
  desc: { ...font.serif, fontSize: 16, lineHeight: 23, color: colors.stoneText, marginTop: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  note: { ...ui.card, flexDirection: "row", gap: spacing.md, alignItems: "flex-start", padding: spacing.lg, marginTop: spacing.lg },
  noteClosed: { backgroundColor: colors.chiliSoft, borderColor: colors.chiliBorder },
  noteText: { flex: 1, ...font.serif, fontSize: 14, lineHeight: 20, color: colors.stoneText },
  noteAllergen: { backgroundColor: colors.amberTint, borderColor: colors.amberBorder },
  noteTitle: { ...font.displayBold, fontSize: 15, color: colors.ink },
  section: { marginTop: layout.section, marginBottom: spacing.md },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: layout.gutter, paddingTop: spacing.md, backgroundColor: colors.paper, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft },
  buttonOff: { backgroundColor: colors.paperDim },
});
