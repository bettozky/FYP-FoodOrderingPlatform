import React from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart, lineTotalQty } from "../CartContext";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import DishImage from "../../../shared/components/DishImage";
import { MODE_ICON, MODE_LABEL, Mode } from "../../../shared/api/types";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";

const ALL_MODES: Mode[] = ["dine_in", "takeaway", "delivery"];
const DELIVERY_FEE = 3.5; // display only; the server calculates the real fee

// Each dish has its own quantity per fulfilment mode, so one order can mix dine-in, takeaway and delivery.
export default function CartScreen({ navigation }: any) {
  const { lines, merchant, setLineQty, removeLine, subtotal, hasDelivery } = useCart();
  const modes = merchant?.dineInOnly ? (["dine_in"] as Mode[]) : ALL_MODES;
  const deliveryFee = hasDelivery ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  if (lines.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Your cart" />
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={type.h3}>Your cart is empty</Text>
          <Text style={type.bodyMuted}>Search a dish you're craving to get started.</Text>
          <PrimaryButton label="Browse dishes" style={{ marginTop: spacing.lg }} onPress={() => navigation.popTo("MainTabs")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Your cart" subtitle={merchant ? `from ${merchant.name}` : undefined} />

      <FlatList
        data={lines}
        keyExtractor={(l) => l.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={[type.bodyMuted, { marginBottom: spacing.md }]}>Choose dine-in, takeaway or delivery for each item. You pay once for everything.</Text>}
        renderItem={({ item }) => (
          <View style={styles.line}>
            <View style={styles.lineTop}>
              <DishImage dish={item.dish} imageStyle={styles.lineImage} emojiStyle={styles.lineEmoji} />
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{item.dish.name}</Text>
                <Text style={type.bodyMuted}>RM {item.dish.price.toFixed(2)} each{item.options.length ? ` · ${item.options.join(", ")}` : ""}</Text>
              </View>
              <Pressable onPress={() => removeLine(item.key)} hitSlop={8} testID={`remove-${item.dish.id}`}>
                <Ionicons name="trash-outline" size={18} color={colors.stone} />
              </Pressable>
            </View>
            {modes.map((m) => (
              <View key={m} style={styles.modeRow}>
                <Ionicons name={MODE_ICON[m] as any} size={15} color={item.qty[m] ? colors.ink : colors.textFaint} />
                <Text style={[styles.modeLabel, !item.qty[m] && { color: colors.stone }]}>{MODE_LABEL[m]}</Text>
                <View style={styles.stepper}>
                  <Pressable onPress={() => setLineQty(item.key, m, item.qty[m] - 1)} style={styles.stepBtn} testID={`dec-${item.dish.id}-${m}`}>
                    <Text style={styles.stepBtnText}>–</Text>
                  </Pressable>
                  <Text style={styles.qty} testID={`qty-${item.dish.id}-${m}`}>{item.qty[m]}</Text>
                  <Pressable onPress={() => setLineQty(item.key, m, item.qty[m] + 1)} style={styles.stepBtn} testID={`inc-${item.dish.id}-${m}`}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Text style={[type.small, { textAlign: "right" }]}>{lineTotalQty(item.qty)} × = RM {(item.dish.price * lineTotalQty(item.qty)).toFixed(2)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={type.bodyMuted}>Subtotal</Text>
          <Text style={type.body}>RM {subtotal.toFixed(2)}</Text>
        </View>
        {hasDelivery && (
          <View style={styles.summaryRow}>
            <Text style={type.bodyMuted}>Delivery fee (once, for delivery items)</Text>
            <Text style={type.body}>RM {deliveryFee.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, { marginTop: 4 }]}>
          <Text style={type.h3}>Total</Text>
          <Text style={type.h3} testID="cart-total">RM {total.toFixed(2)}</Text>
        </View>
        <PrimaryButton label="Proceed to checkout" style={{ marginTop: spacing.md }} onPress={() => navigation.navigate("Checkout")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  line: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  lineTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  lineEmoji: { fontSize: 32 },
  lineImage: { width: 44, height: 44, borderRadius: radius.sm },
  modeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.paperDim, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: spacing.md },
  modeLabel: { flex: 1, fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  stepBtnText: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text, marginTop: -1 },
  qty: { minWidth: 18, textAlign: "center", fontFamily: fonts.displayBold },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: spacing.xl },
});
