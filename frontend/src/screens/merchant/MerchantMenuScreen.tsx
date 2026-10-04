import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Switch,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { merchantMenu, Dish } from "../../data/mockData";
import ScreenHeader from "../../components/ScreenHeader";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type, fonts } from "../../theme/theme";

export interface ExtendedDish extends Dish {
  category?: "Mains" | "Drinks" | "Combos";
  quantity: number; // Stock inventory count
  cost: number;     // Food preparation / ingredient cost (RM)
}

const CATEGORIES = ["All", "Mains", "Drinks", "Combos"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export default function MerchantMenuScreen() {
  // Initialize dishes with category, quantity, and default cost (~40% of price)
  const [menu, setMenu] = useState<ExtendedDish[]>(() =>
    merchantMenu.map((d, index) => {
      const initialQty = d.soldOut ? 0 : (index + 2) * 8;
      const initialCost = parseFloat((d.price * 0.4).toFixed(2)); // default 40% cost

      return {
        ...d,
        cost: (d as any).cost !== undefined ? (d as any).cost : initialCost,
        quantity: initialQty,
        soldOut: initialQty === 0 ? true : Boolean(d.soldOut),
        category:
          (d as any).category ||
          (index % 3 === 0 ? "Mains" : index % 3 === 1 ? "Drinks" : "Combos"),
      };
    })
  );

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("All");

  // Modal State for Add / Edit Dish
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  // Form Fields
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishCost, setDishCost] = useState(""); // Ingredient Cost field
  const [dishQuantity, setDishQuantity] = useState("10");
  const [dishCategory, setDishCategory] = useState<"Mains" | "Drinks" | "Combos">("Mains");
  const [dishEmoji, setDishEmoji] = useState("🍜");

  // Filtered menu list based on category
  const filteredMenu =
    selectedCategory === "All"
      ? menu
      : menu.filter((d) => d.category === selectedCategory);

  // Manual Stock Toggle with Guardrail
  const toggleSoldOut = (dish: ExtendedDish) => {
    if (dish.soldOut && dish.quantity <= 0) {
      alert("Cannot mark In Stock with 0 quantity. Please click 'Edit' and restock the quantity first.");
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
    setDishCategory("Mains");
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
    setDishCategory(dish.category || "Mains");
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
                category: dishCategory,
                image: dishEmoji.trim() || "🍽️",
              }
            : d
        )
      );
    } else {
      // Add new dish
      const newDish: ExtendedDish = {
        id: `dish-${Date.now()}`,
        name: dishName.trim(),
        price: parsedPrice,
        cost: parsedCost,
        quantity: parsedQty,
        soldOut: isAutoSoldOut,
        image: dishEmoji.trim() || "🍽️",
        category: dishCategory,
      };
      setMenu((prev) => [newDish, ...prev]);
    }

    setIsModalOpen(false);
  };

  // Modal profit preview calculations
  const numPrice = parseFloat(dishPrice) || 0;
  const numCost = parseFloat(dishCost) || 0;
  const numProfit = numPrice - numCost;

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

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
                {editingDishId ? "Edit Dish & Costing" : "Add New Dish"}
              </Text>
              <Text style={[type.bodyMuted, { marginBottom: spacing.md }]}>
                Set item pricing, ingredient costs, and stock inventory.
              </Text>

              {/* Dish Name */}
              <Text style={styles.inputLabel}>Dish Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Seafood Fried Rice"
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

              {/* Category Selector */}
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categorySelectRow}>
                {(["Mains", "Drinks", "Combos"] as const).map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryChoice,
                      dishCategory === cat && styles.categoryChoiceActive,
                    ]}
                    onPress={() => setDishCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChoiceText,
                        dishCategory === cat && styles.categoryChoiceTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Price & Cost in a 2-Column Row */}
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
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
              <Text style={styles.inputLabel}>Available Stock Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 25 (0 = Sold Out)"
                keyboardType="numeric"
                value={dishQuantity}
                onChangeText={setDishQuantity}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                * Setting quantity to 0 will mark the dish as sold out.
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

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  headerSection: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  /* Add button */
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  addBtnText: {
    color: colors.white,
    fontFamily: fonts?.displayBold || fonts?.display,
    fontSize: 14,
    fontWeight: "700",
  },

  /* Category Filter Chips */
  categoryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts?.display,
  },
  categoryTextActive: {
    color: colors.white,
    fontWeight: "700",
  },

  /* Dish Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardSoldOut: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    opacity: 0.85,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  emoji: { fontSize: 32 },
  textMuted: {
    color: colors.textMuted || "#64748b",
    textDecorationLine: "line-through",
  },

  /* Pricing, Cost & Profit Styles */
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  costLabel: {
    fontSize: 12,
    color: colors.textMuted || "#64748b",
  },
  profitLabel: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  profitPos: {
    backgroundColor: "#ecfdf5",
    color: "#059669",
  },
  profitNeg: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
  },

  qtyBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "600",
  },
  qtyActive: {
    backgroundColor: "#ecfdf5",
    color: "#065f46",
  },
  qtyZero: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
  toggleCol: {
    alignItems: "center",
    gap: 4,
  },

  /* Edit & Delete Action Buttons */
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  editBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBtnText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts?.display,
  },
  deleteBtn: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteBtnText: {
    fontSize: 12,
    color: "#dc2626",
    fontFamily: fonts?.display,
    fontWeight: "600",
  },

  /* Modal Form */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  previewBox: {
    backgroundColor: "#f8fafc",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  categorySelectRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  categoryChoice: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  categoryChoiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChoiceText: {
    fontSize: 13,
    color: colors.text,
  },
  categoryChoiceTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
  },
  cancelBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },

  /* Mouse hover effect */
  btnHover: {
    transform: [{ translateY: -2 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
});