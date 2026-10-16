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
import { colors, spacing, type } from "../../../shared/theme/theme";
import { merchantMenuStyles as styles } from "../styles";

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
  style?: "dry" | "wet";
  customisations: string[];
}

const NO_LIMIT = 999;
const DIETARY = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "plant_based", label: "Plant-based" },
  { key: "spicy", label: "Spicy" },
  { key: "allergy_free", label: "Allergy-free" },
];

const fromApi = (d: any): ExtendedDish => ({
  id: d.id, name: d.name, price: d.price, image: d.image, description: d.description, category: d.category,
  calories: d.calories, soldOut: d.soldOut, quantity: d.stock ?? NO_LIMIT, cost: d.cost ?? 0,
  dietary: d.dietary ?? [], style: d.style, customisations: d.customisations ?? [],
});

export default function MerchantMenuScreen() {
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
  const [dishEmoji, setDishEmoji] = useState("🍜");
  const [dishDietary, setDishDietary] = useState<string[]>([]);
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
      alert("Cannot mark In Stock with 0 quantity. Please click 'Edit Price, Cost & Stock' and restock the quantity first.");
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
    setDishEmoji("🍜");
    setDishDietary([]);
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
    setDishEmoji(dish.image || "🍜");
    setDishDietary(dish.dietary);
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
    if (!dishName.trim() || !dishPrice.trim()) return;
    const qty = dishQuantity.trim() === "" ? undefined : Math.max(0, parseInt(dishQuantity, 10) || 0);
    const body = {
      name: dishName.trim(),
      price: parseFloat(dishPrice) || 0,
      cost: parseFloat(dishCost) || 0,
      stock: qty,
      soldOut: qty === 0,
      category: dishCategory.trim() || "General",
      image: dishEmoji.trim() || "🍽️",
      dietary: dishDietary,
      style: dishStyle,
      customisations: dishCustom.split(",").map((x) => x.trim()).filter(Boolean),
    };
    try {
      if (editingDishId) await api("PATCH", `/merchant/dishes/${editingDishId}`, body);
      else await api("POST", "/merchant/dishes", body);
      setIsModalOpen(false);
      setMessage("");
      load();
    } catch (e) {
      setMessage(errorText(e));
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
        title="Menu Management"
        subtitle={`${menu.length} total dishes · ${menu.filter((d) => !d.soldOut && d.quantity > 0).length} in stock`}
      />
      {message ? <Text style={{ color: colors.danger, paddingHorizontal: spacing.lg }}>{message}</Text> : null}

      <FlatList
        data={filteredMenu}
        ListEmptyComponent={<EmptyState icon="restaurant-outline" title="No dishes here" hint="Add your first dish to start taking orders." />}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Add New Dish Action Button */}
            <Pressable
              style={({ hovered }: any) => [styles.addBtn, hovered && styles.btnHover]}
              onPress={handleOpenAddModal}
            >
              <Text style={styles.addBtnText}>+ Add New Dish</Text>
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
                      {cat}
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
                {/* Dish Emoji / Thumbnail */}
                <Text style={styles.emoji}>{item.image}</Text>

                {/* Dish Info & Financial Breakdown */}
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={[type.h3, isUnavailable && styles.textMuted]}>
                      {item.name}
                    </Text>
                    {item.category && <Badge label={item.category} tone="neutral" />}
                  </View>

                  {/* Price, Cost & Profit Info */}
                  <View style={styles.pricingRow}>
                    <Text style={[type.body, { color: colors.primary, fontWeight: "700" }]}>
                      RM {item.price.toFixed(2)}
                    </Text>
                    <Text style={styles.costLabel}>
                      Cost: RM {(item.cost || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.profitLabel, profit >= 0 ? styles.profitPos : styles.profitNeg]}>
                      Profit: RM {profit.toFixed(2)}
                    </Text>
                  </View>

                  {/* Quantity Display Badge */}
                  <View style={{ flexDirection: "row", marginTop: 2 }}>
                    <Text
                      style={[
                        styles.qtyBadge,
                        item.quantity === 0 ? styles.qtyZero : styles.qtyActive,
                      ]}
                    >
                      {item.quantity === 0 ? "0 in stock (Sold Out)" : item.quantity >= NO_LIMIT ? "No stock limit" : `${item.quantity} available`}
                    </Text>
                  </View>
                </View>

                {/* Real-Time Out-of-Stock Toggle */}
                <View style={styles.toggleCol}>
                  <Badge
                    label={isUnavailable ? "Sold Out" : "In Stock"}
                    tone={isUnavailable ? "warning" : "success"}
                  />
                  <Switch
                    value={!isUnavailable}
                    onValueChange={() => toggleSoldOut(item)}
                    trackColor={{ false: colors.border, true: colors.primarySoft }}
                    thumbColor={isUnavailable ? colors.textFaint : colors.primary}
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
                  <Text style={styles.editBtnText}>Edit Price, Cost & Stock</Text>
                </Pressable>

                <Pressable
                  style={({ hovered }: any) => [
                    styles.actionBtn,
                    styles.deleteBtn,
                    hovered && styles.btnHover,
                  ]}
                  onPress={() => handleDeleteDish(item.id)}
                >
                  <Text style={styles.deleteBtnText}>Remove</Text>
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
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={type.h2}>
                {editingDishId ? "Edit Dish & Category" : "Add New Dish"}
              </Text>
              <Text style={[type.bodyMuted, styles.modalSubtitle]}>
                Set item title, custom category, prices, and stock inventory.
              </Text>

              {/* Dish Name */}
              <Text style={styles.inputLabel}>Dish Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Claypot Chicken Rice"
                value={dishName}
                onChangeText={setDishName}
              />

              {/* Dish Icon / Emoji */}
              <Text style={styles.inputLabel}>Emoji Icon</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 🍛, 🍜, 🧋, 🍗"
                value={dishEmoji}
                onChangeText={setDishEmoji}
              />

              {/* Category: Manual Typing + Quick Pick Chips */}
              <Text style={styles.inputLabel}>
                Food Category (Type any custom category)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Noodles, Desserts, Western, Breakfast"
                value={dishCategory}
                onChangeText={setDishCategory}
              />

              {/* Quick Pick Existing Categories */}
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, marginBottom: 4 }}>
                Or select from existing categories:
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
                  <Text style={styles.inputLabel}>Selling Price (RM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 12.50"
                    keyboardType="numeric"
                    value={dishPrice}
                    onChangeText={setDishPrice}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Ingredient Cost (RM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 5.00"
                    keyboardType="numeric"
                    value={dishCost}
                    onChangeText={setDishCost}
                  />
                </View>
              </View>

              {/* Dynamic Profit Preview Box */}
              {numPrice > 0 && (
                <View style={styles.previewBox}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    Estimated Profit:{" "}
                    <Text
                      style={{
                        fontWeight: "700",
                        color: numProfit >= 0 ? "#2F6F4E" : "#C2382C",
                      }}
                    >
                      RM {numProfit.toFixed(2)}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Stock Quantity */}
              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>Available Stock Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave empty for no limit (0 = Sold Out)"
                keyboardType="numeric"
                value={dishQuantity}
                onChangeText={setDishQuantity}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                * Setting quantity to 0 will automatically mark the dish as sold out.
              </Text>

              {/* Dietary tags (customers can filter by these - FR-1.4) */}
              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>Dietary tags</Text>
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
              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>Dry or wet</Text>
              <View style={styles.quickCategoryRow}>
                {([["", "Not set"], ["dry", "Dry"], ["wet", "Wet / soup"]] as const).map(([k, label]) => (
                  <Pressable key={k} style={[styles.quickCatChip, dishStyle === k && styles.quickCatChipActive]} onPress={() => setDishStyle(k)}>
                    <Text style={[styles.quickCatText, dishStyle === k && styles.quickCatTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>Customisations customers can pick (comma separated)</Text>
              <TextInput style={styles.input} placeholder="e.g. No spring onion, Extra sambal, Less sweet" value={dishCustom} onChangeText={setDishCustom} />

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <Pressable
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={handleSaveDish}
                >
                  <Text style={styles.saveBtnText}>
                    {editingDishId ? "Update Dish" : "Create Dish"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}