import React, { useState, useMemo, useEffect } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import {
  View,
  Text,
  FlatList,
  Switch,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { api, errorText } from "../../../shared/api/client";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import DishImage from "../../../shared/components/DishImage";
import PhotoField from "../../../shared/components/PhotoField";
import { form, LocalFile } from "../../../shared/util/files";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, type, ui } from "../../../shared/theme/theme";
import { merchantMenuStyles as styles } from "../styles";
import { ALLERGENS } from "../../onboarding/signup/types";
import DealControl, { type Deal } from "../DealControl";
import i18n from "../../../shared/i18n";
import { allergenList, allergenName } from "../../../shared/i18n/labels";
import { useTranslation } from "react-i18next";

export interface ExtendedDish {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  calories: number;
  soldOut: boolean;
  quantity: number; // stock count (999 = no limit)
  cost: number; // ingredient cost (RM)
  dietary: string[];
  allergens: string[];
  style?: "dry" | "wet";
  customisations: string[];
  deal?: Deal; // Sprint 3 last-hour deal
}

const NO_LIMIT = 999;
const DIETARY = [
  { key: "vegetarian", get label() { return i18n.t("diet.vegetarian"); } },
  { key: "plant_based", get label() { return i18n.t("diet.plantBased"); } },
  { key: "spicy", get label() { return i18n.t("diet.spicy"); } },
  { key: "allergy_free", get label() { return i18n.t("diet.allergyFree"); } },
];

const fromApi = (d: any): ExtendedDish => ({
  id: d.id, name: d.name, price: d.price, image: d.image, description: d.description, category: d.category,
  calories: d.calories, soldOut: d.soldOut, quantity: d.stock ?? NO_LIMIT, cost: d.cost ?? 0,
  dietary: d.dietary ?? [], allergens: d.allergens ?? [], style: d.style, customisations: d.customisations ?? [],
  deal: d.deal,
});

export default function MerchantMenuScreen() {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<ExtendedDish[]>([]);
  const [message, setMessage] = useState("");

  const load = () =>
    api<{ dishes: any[] }>("GET", "/merchant/dishes").then((r) => setMenu(r.dishes.map(fromApi))).catch((e) => setMessage(errorText(e)));
  useEffect(() => {
    load();
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Dynamically extract all unique categories in the menu for the filter bar
  const dynamicCategories = useMemo(() => {
    const unique = Array.from(
      new Set(menu.map((d) => d.category).filter(Boolean))
    );
    return ["All", ...unique];
  }, [menu]);

  // Modal State for Add / Edit Dish
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  // Form Fields
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishCost, setDishCost] = useState("");
  const [dishQuantity, setDishQuantity] = useState("10");
  const [dishCategory, setDishCategory] = useState("Noodles");
  const [dishPhoto, setDishPhoto] = useState(""); // the photo the dish has now (a link from the server)
  const [dishFile, setDishFile] = useState<LocalFile | null>(null); // a new photo chosen on this phone, uploaded on save
  const [saving, setSaving] = useState(false);
  const [dishDietary, setDishDietary] = useState<string[]>([]);
  const [dishAllergens, setDishAllergens] = useState<string[]>([]);
  const [dishStyle, setDishStyle] = useState<"" | "dry" | "wet">("");
  const [dishCustom, setDishCustom] = useState("");

  // Filtered menu list based on selected category
  const filteredMenu =
    selectedCategory === "All"
      ? menu
      : menu.filter((d) => d.category.toLowerCase() === selectedCategory.toLowerCase());

  // Manual Stock Toggle with Guardrail
  const toggleSoldOut = (dish: ExtendedDish) => {
    if (dish.soldOut && dish.quantity <= 0) {
      alert(t("menu.cannotRestock"));
      return;
    }

    // FR-5.3: sold out hides the dish from customers without deleting it
    api("PATCH", `/merchant/dishes/${dish.id}`, { soldOut: !dish.soldOut }).then(load).catch((e) => setMessage(errorText(e)));
  };

  // Open modal for Creating a new Dish
  const handleOpenAddModal = () => {
    setEditingDishId(null);
    setDishName("");
    setDishPrice("");
    setDishCost("");
    setDishQuantity("20");
    setDishCategory("Noodles");
    setDishPhoto("");
    setDishFile(null);
    setDishDietary([]);
    setDishAllergens([]);
    setDishStyle("");
    setDishCustom("");
    setIsModalOpen(true);
  };

  // Open modal for Editing an existing Dish
  const handleOpenEditModal = (dish: ExtendedDish) => {
    setEditingDishId(dish.id);
    setDishName(dish.name);
    setDishPrice(dish.price.toString());
    setDishCost(dish.cost !== undefined ? dish.cost.toString() : "");
    setDishQuantity(dish.quantity >= NO_LIMIT ? "" : dish.quantity.toString());
    setDishCategory(dish.category || "General");
    setDishPhoto(dish.image || "");
    setDishFile(null);
    setDishDietary(dish.dietary);
    setDishAllergens(dish.allergens);
    setDishStyle(dish.style ?? "");
    setDishCustom(dish.customisations.join(", "));
    setIsModalOpen(true);
  };

  // Delete Dish
  const handleDeleteDish = (id: string) => {
    api("DELETE", `/merchant/dishes/${id}`).then(load).catch((e) => setMessage(errorText(e)));
  };

  // Save (Create or Update) Dish
  const handleSaveDish = async () => {
    if (!dishName.trim() || !dishPrice.trim() || saving) return;
    const qty = dishQuantity.trim() === "" ? undefined : Math.max(0, parseInt(dishQuantity, 10) || 0);
    const body: Record<string, unknown> = {
      name: dishName.trim(),
      price: parseFloat(dishPrice) || 0,
      cost: parseFloat(dishCost) || 0,
      stock: qty,
      soldOut: qty === 0,
      category: dishCategory.trim() || "General",
      // A dish with allergens cannot also be tagged "Allergy-free" (the server drops that tag too).
      dietary: dishAllergens.length ? dishDietary.filter((x) => x !== "allergy_free") : dishDietary,
      allergens: dishAllergens,
      style: dishStyle,
      customisations: dishCustom.split(",").map((x) => x.trim()).filter(Boolean),
    };
    // Photo: a new photo is uploaded after the dish is saved; "Remove" clears it; otherwise the current photo stays.
    if (!dishFile && !dishPhoto) body.image = "";
    setSaving(true);
    setMessage("");
    try {
      const saved = editingDishId
        ? await api<{ dish: { id: string } }>("PATCH", `/merchant/dishes/${editingDishId}`, body)
        : await api<{ dish: { id: string } }>("POST", "/merchant/dishes", body);
      if (dishFile) {
        try {
          await api("POST", `/merchant/dishes/${saved.dish.id}/image`, await form({}, { file: dishFile }));
        } catch (e) {
          // The dish itself is saved; only the picture failed. Keep the form open on the saved dish so they can retry.
          setEditingDishId(saved.dish.id);
          setMessage(t("menu.photoFailed", { error: errorText(e) }));
          load();
          return;
        }
      }
      setIsModalOpen(false);
      load();
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  // Profit preview calculation
  const numPrice = parseFloat(dishPrice) || 0;
  const numCost = parseFloat(dishCost) || 0;
  const numProfit = numPrice - numCost;

  // List of existing categories to display as quick-picker chips in modal
  const existingCategoriesList = useMemo(() => {
    const list = Array.from(new Set(menu.map((d) => d.category).filter(Boolean)));
    return list.length > 0 ? list : ["Noodles", "Rice", "Beverages", "Combos", "Desserts"];
  }, [menu]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={t("menu.screenTitle")}
        subtitle={t("menu.subtitle", { total: menu.length, inStock: menu.filter((d) => !d.soldOut && d.quantity > 0).length })}
      />
      {message ? <Text style={{ color: colors.chiliText, paddingHorizontal: spacing.lg }}>{message}</Text> : null}

      <FlatList
        data={filteredMenu}
        ListEmptyComponent={<EmptyState icon="restaurant-outline" title={t("menu.empty")} hint={t("menu.emptyHint")} />}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Add New Dish Action Button */}
            <Pressable
              style={({ hovered }: any) => [styles.addBtn, hovered && styles.btnHover]}
              onPress={handleOpenAddModal}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.addBtnText}>{t("menu.add")}</Text>
            </Pressable>

            {/* Dynamic Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {dynamicCategories.map((cat) => {
                const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <Pressable
                    key={cat}
                    style={({ hovered }: any) => [
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                      hovered && styles.btnHover,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {cat === "All" ? t("menu.all") : cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => {
          const isUnavailable = item.soldOut || item.quantity === 0;
          const profit = item.price - (item.cost || 0);

          return (
            <View style={[styles.card, isUnavailable && styles.cardSoldOut]}>
              <View style={styles.mainRow}>
                {/* Dish photo */}
                <DishImage image={item.image} size={56} />

                {/* Dish Info & Financial Breakdown */}
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={[type.h3, isUnavailable && styles.textMuted]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.category && <Badge label={item.category} tone="neutral" />}
                  </View>

                  {/* Price, Cost & Profit Info */}
                  <View style={styles.pricingRow}>
                    <Text style={ui.price}>
                      RM {item.price.toFixed(2)}
                    </Text>
                    <Text style={styles.costLabel}>
                      {t("menu.cost", { amount: (item.cost || 0).toFixed(2) })}
                    </Text>
                    <Text style={[styles.profitLabel, profit >= 0 ? styles.profitPos : styles.profitNeg]}>
                      {t("menu.profit", { amount: profit.toFixed(2) })}
                    </Text>
                  </View>

                  {item.allergens.length ? (
                    <Text style={styles.costLabel}>{t("menu.contains", { list: allergenList(item.allergens) })}</Text>
                  ) : null}

                  {/* Sprint 3: last-hour deal (not for sold-out dishes) */}
                  {!isUnavailable || item.deal ? <DealControl dishId={item.id} price={item.price} deal={item.deal} onChanged={load} /> : null}

                  {/* Quantity Display Badge */}
                  <View style={{ flexDirection: "row", marginTop: 2 }}>
                    <Text
                      style={[
                        styles.qtyBadge,
                        item.quantity === 0 ? styles.qtyZero : styles.qtyActive,
                      ]}
                    >
                      {item.quantity === 0 ? t("menu.zeroStock") : item.quantity >= NO_LIMIT ? t("menu.noLimit") : t("menu.available", { n: item.quantity })}
                    </Text>
                  </View>
                </View>

                {/* Real-Time Out-of-Stock Toggle */}
                <View style={styles.toggleCol}>
                  <Badge
                    label={isUnavailable ? t("menu.soldOut") : t("menu.inStock")}
                    tone={isUnavailable ? "warning" : "success"}
                  />
                  <Switch
                    value={!isUnavailable}
                    onValueChange={() => toggleSoldOut(item)}
                    trackColor={{ false: colors.stoneSoft, true: colors.herb }}
                    thumbColor={colors.white}
                    {...({ ios_backgroundColor: colors.stoneSoft, activeThumbColor: colors.white } as object)}
                    accessibilityLabel={isUnavailable ? `${item.name} is sold out. Turn on to put it back in stock` : `${item.name} is in stock. Turn off to mark it sold out`}
                  />
                </View>
              </View>

              {/* Action Bar: Edit & Remove */}
              <View style={styles.actionRow}>
                <Pressable
                  style={({ hovered }: any) => [
                    styles.actionBtn,
                    styles.editBtn,
                    hovered && styles.btnHover,
                  ]}
                  onPress={() => handleOpenEditModal(item)}
                >
                  <Text style={styles.editBtnText}>{t("menu.editBtn")}</Text>
                </Pressable>

                <Pressable
                  style={({ hovered }: any) => [
                    styles.actionBtn,
                    styles.deleteBtn,
                    hovered && styles.btnHover,
                  ]}
                  onPress={() => handleDeleteDish(item.id)}
                >
                  <Text style={styles.deleteBtnText}>{t("photo.remove")}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {/* ================= ADD / EDIT DISH MODAL ================= */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
              <Text style={type.h2}>
                {editingDishId ? t("menu.editTitle") : t("menu.add")}
              </Text>
              <Text style={[type.bodyMuted, styles.modalSubtitle]}>
                {t("menu.formIntro")}
              </Text>

              {/* Dish Name */}
              <Text style={styles.inputLabel}>{t("menu.name")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("menu.namePh")}
                value={dishName}
                onChangeText={setDishName}
              />

              {/* Dish photo: choose from the gallery or take one now. It is resized on the phone, then uploaded on save. */}
              <View style={{ marginTop: spacing.md }}>
                <PhotoField label={t("menu.photo")} current={dishPhoto} picked={dishFile} aspect={[4, 3]} busy={saving} onPick={setDishFile} onRemove={() => { setDishFile(null); setDishPhoto(""); }} />
              </View>

              {/* Category: Manual Typing + Quick Pick Chips */}
              <Text style={styles.inputLabel}>
                {t("menu.category")}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("menu.categoryPh")}
                value={dishCategory}
                onChangeText={setDishCategory}
              />

              {/* Quick Pick Existing Categories */}
              <Text style={{ fontSize: 11, color: colors.stoneText, marginTop: 4, marginBottom: 4 }}>
                {t("menu.pickCategory")}
              </Text>
              <View style={styles.quickCategoryRow}>
                {existingCategoriesList.map((cat) => {
                  const isSelected = dishCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.quickCatChip,
                        isSelected && styles.quickCatChipActive,
                      ]}
                      onPress={() => setDishCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.quickCatText,
                          isSelected && styles.quickCatTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Price & Cost in a 2-Column Row */}
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t("menu.price")}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("menu.eg", { v: "12.50" })}
                    keyboardType="numeric"
                    value={dishPrice}
                    onChangeText={setDishPrice}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t("menu.costLabel")}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("menu.eg", { v: "5.00" })}
                    keyboardType="numeric"
                    value={dishCost}
                    onChangeText={setDishCost}
                  />
                </View>
              </View>

              {/* Dynamic Profit Preview Box */}
              {numPrice > 0 && (
                <View style={styles.previewBox}>
                  <Text style={{ fontSize: 12, color: colors.stoneText }}>
                    {t("menu.estProfit")}{" "}
                    <Text
                      style={{
                        fontWeight: "700",
                        color: numProfit >= 0 ? colors.herb : colors.chiliText,
                      }}
                    >
                      RM {numProfit.toFixed(2)}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Stock Quantity */}
              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>{t("menu.stock")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("menu.stockPh")}
                keyboardType="numeric"
                value={dishQuantity}
                onChangeText={setDishQuantity}
              />
              <Text style={{ fontSize: 11, color: colors.stoneText, marginTop: 3 }}>
                * {t("menu.zeroHint")}
              </Text>

              {/* Dietary tags (customers can filter by these - FR-1.4) */}
              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>{t("menu.dietary")}</Text>
              <View style={styles.quickCategoryRow}>
                {DIETARY.map((d) => {
                  const on = dishDietary.includes(d.key);
                  return (
                    <Pressable key={d.key} style={[styles.quickCatChip, on && styles.quickCatChipActive]} onPress={() => setDishDietary((p) => (on ? p.filter((x) => x !== d.key) : [...p, d.key]))}>
                      <Text style={[styles.quickCatText, on && styles.quickCatTextActive]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {/* Allergens: customers see "Contains: ..." on the dish page. */}
              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>{t("menu.allergens")}</Text>
              <View style={styles.quickCategoryRow}>
                {ALLERGENS.map(({ name }) => {
                  const on = dishAllergens.includes(name);
                  return (
                    <Pressable key={name} style={[styles.quickCatChip, on && styles.quickCatChipActive]} onPress={() => setDishAllergens((p) => (on ? p.filter((x) => x !== name) : [...p, name]))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`dish-allergen-${name}`}>
                      <Text style={[styles.quickCatText, on && styles.quickCatTextActive]}>{allergenName(name)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ fontSize: 11, color: colors.stoneText, marginTop: 3 }}>
                {t("menu.hiddenAllergens")}
              </Text>

              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>{t("menu.dryWet")}</Text>
              <View style={styles.quickCategoryRow}>
                {([["", t("menu.notSet")], ["dry", t("menu.dry")], ["wet", t("menu.wet")]] as const).map(([k, label]) => (
                  <Pressable key={k} style={[styles.quickCatChip, dishStyle === k && styles.quickCatChipActive]} onPress={() => setDishStyle(k)}>
                    <Text style={[styles.quickCatText, dishStyle === k && styles.quickCatTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>{t("menu.custom")}</Text>
              <TextInput style={styles.input} placeholder={t("menu.customPh")} value={dishCustom} onChangeText={setDishCustom} />

              <View style={{ height: spacing.md }} />
            </ScrollView>

            {/* Buttons stay pinned under the scrolling form so they are always reachable on a small phone. */}
            <View style={styles.modalFooter}>
              {message ? <Text style={{ color: colors.chiliText, marginTop: spacing.sm }}>{message}</Text> : null}

              <View style={styles.modalBtnRow}>
                <Pressable
                  style={[styles.modalBtn, styles.cancelBtn]}
                  testID="dish-cancel"
                  onPress={() => !saving && setIsModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalBtn, styles.saveBtn]}
                  testID="dish-save"
                  onPress={handleSaveDish}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? t("common.saving") : editingDishId ? t("menu.update") : t("menu.create")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}