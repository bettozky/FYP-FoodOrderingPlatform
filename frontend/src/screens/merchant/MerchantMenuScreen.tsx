import React, { useState, useMemo } from "react";
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
import { merchantMenu, Dish } from "../../data/mockData";
import ScreenHeader from "../../components/ScreenHeader";
import Badge from "../../components/Badge";
import { colors, spacing, type } from "../../theme/theme";
import { merchantMenuStyles as styles } from "../../styles/Merchantstyles";

export interface ExtendedDish extends Dish {
  category: string; // Dynamic custom category string
  quantity: number; // Stock inventory count
  cost: number;     // Food preparation / ingredient cost (RM)
}

export default function MerchantMenuScreen() {
  // Initialize dishes with categories, quantities, and costs
  const [menu, setMenu] = useState<ExtendedDish[]>(() =>
    merchantMenu.map((d, index) => {
      const initialQty = d.soldOut ? 0 : (index + 2) * 8;
      const initialCost = parseFloat((d.price * 0.4).toFixed(2));
      const defaultCategories = ["Noodles", "Rice", "Beverages", "Snacks"];

      return {
        ...d,
        category: (d as any).category || defaultCategories[index % defaultCategories.length],
        cost: (d as any).cost !== undefined ? (d as any).cost : initialCost,
        quantity: initialQty,
        soldOut: initialQty === 0 ? true : Boolean(d.soldOut),
      };
    })
  );

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

    setMenu((prev) =>
      prev.map((d) =>
        d.id === dish.id
          ? {
              ...d,
              soldOut: !d.soldOut,
            }
          : d
      )
    );
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
    setIsModalOpen(true);
  };

  // Open modal for Editing an existing Dish
  const handleOpenEditModal = (dish: ExtendedDish) => {
    setEditingDishId(dish.id);
    setDishName(dish.name);
    setDishPrice(dish.price.toString());
    setDishCost(dish.cost !== undefined ? dish.cost.toString() : "");
    setDishQuantity(dish.quantity.toString());
    setDishCategory(dish.category || "General");
    setDishEmoji(dish.image || "🍜");
    setIsModalOpen(true);
  };

  // Delete Dish
  const handleDeleteDish = (id: string) => {
    setMenu((prev) => prev.filter((d) => d.id !== id));
  };

  // Save (Create or Update) Dish
  const handleSaveDish = () => {
    if (!dishName.trim() || !dishPrice.trim()) return;

    const parsedPrice = parseFloat(dishPrice) || 0;
    const parsedCost = parseFloat(dishCost) || 0;
    const parsedQty = Math.max(0, parseInt(dishQuantity, 10) || 0);
    const isAutoSoldOut = parsedQty === 0;
    const finalCategory = dishCategory.trim() || "General";

    if (editingDishId) {
      // Edit existing dish
      setMenu((prev) =>
        prev.map((d) =>
          d.id === editingDishId
            ? {
                ...d,
                name: dishName.trim(),
                price: parsedPrice,
                cost: parsedCost,
                quantity: parsedQty,
                soldOut: isAutoSoldOut ? true : false,
                category: finalCategory,
                image: dishEmoji.trim() || "🍽️",
              }
            : d
        )
      );
    } else {
      // Add new dish with all required Dish properties
      const newDish: ExtendedDish = {
        id: `dish-${Date.now()}`,
        merchantId: (menu[0] as any)?.merchantId || "m1",
        name: dishName.trim(),
        description: "Freshly prepared in house",
        calories: 400,
        price: parsedPrice,
        cost: parsedCost,
        quantity: parsedQty,
        soldOut: isAutoSoldOut,
        image: dishEmoji.trim() || "🍽️",
        category: finalCategory,
      };
      setMenu((prev) => [newDish, ...prev]);
    }

    setIsModalOpen(false);
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

      <FlatList
        data={filteredMenu}
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
                      {item.quantity === 0 ? "0 in stock (Sold Out)" : `${item.quantity} available`}
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
                        color: numProfit >= 0 ? "#059669" : "#dc2626",
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
                placeholder="e.g. 25 (0 = Sold Out)"
                keyboardType="numeric"
                value={dishQuantity}
                onChangeText={setDishQuantity}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                * Setting quantity to 0 will automatically mark the dish as sold out.
              </Text>

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