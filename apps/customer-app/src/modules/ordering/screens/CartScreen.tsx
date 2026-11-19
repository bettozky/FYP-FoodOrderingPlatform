import React from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart, lineTotalQty } from "../CartContext";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { OrderSteps, NotChargedNote } from "../components/OrderSteps";
import { MODE_ICON, MODE_LABEL, Mode } from "../../../shared/api/types";
import DishImage, { softTint } from "../../../shared/components/DishImage";
import EmptyState from "../../../shared/components/EmptyState";
import { colors, layout, radius, shadow, spacing, type, ui, font } from "../../../shared/theme/theme";

const ALL_MODES: Mode[] = ["dine_in", "takeaway", "delivery"];
const DELIVERY_FEE = 3.5; // display only; the server calculates the real fee

// Each dish has its own quantity per fulfilment mode, so one order can mix dine-in, takeaway and delivery.
export default function CartScreen({ navigation }: any) {
  const { lines, merchant, setLineQty, removeLine, subtotal, hasDelivery } = useCart();
  const insets = useSafeAreaInsets();
  const modes = merchant?.dineInOnly ? (["dine_in"] as Mode[]) : ALL_MODES;
  const deliveryFee = hasDelivery ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  if (lines.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Your cart" />
        <View style={styles.emptyWrap}>
          <EmptyState icon="bag-handle-outline" title="Your cart is empty" hint="Find a dish you're craving and tap + to add it." />
          <PrimaryButton label="Browse dishes" style={{ alignSelf: "stretch", marginTop: -spacing.xl }} onPress={() => navigation.popTo("MainTabs")} />
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
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <OrderSteps current={0} />
            <Text style={type.bodyMuted}>Choose dine-in, takeaway or delivery for each item. You pay once for everything.</Text>
          </View>
        }
        ListFooterComponent={<NotChargedNote />}
        renderItem={({ item }) => (
          <View style={styles.line}>
            <View style={styles.lineTop}>
              <DishImage image={item.dish.image} size={60} tint={softTint(merchant?.color)} label={item.dish.name} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={type.h3} numberOfLines={2}>{item.dish.name}</Text>
                <Text style={type.bodyMuted} numberOfLines={2}>RM {item.dish.price.toFixed(2)} each{item.options.length ? ` · ${item.options.join(", ")}` : ""}</Text>
              </View>
              <Pressable onPress={() => removeLine(item.key)} hitSlop={12} style={styles.trashBtn} testID={`remove-${item.dish.id}`} accessibilityRole="button" accessibilityLabel={`Remove ${item.dish.name} from cart`}>
                <Ionicons name="trash-outline" size={18} color={colors.chiliText} />
              </Pressable>
            </View>
            <View style={styles.modes}>
            {modes.map((m, mi) => (
              <View key={m} style={[styles.modeRow, mi > 0 && styles.modeRowLine]}>
                <Ionicons name={MODE_ICON[m] as any} size={18} color={item.qty[m] ? colors.ink : colors.stoneText} />
                <Text style={[styles.modeLabel, !item.qty[m] && { color: colors.stoneText }]}>{MODE_LABEL[m]}</Text>
                <View style={styles.stepper}>
                  <Pressable onPress={() => setLineQty(item.key, m, item.qty[m] - 1)} hitSlop={8} style={styles.stepBtn} testID={`dec-${item.dish.id}-${m}`} accessibilityRole="button" accessibilityLabel={`Decrease ${MODE_LABEL[m]} quantity of ${item.dish.name}`}>
                    <Ionicons name="remove" size={16} color={item.qty[m] > 0 ? colors.ink : colors.stoneSoft} />
                  </Pressable>
                  <Text style={styles.qty} testID={`qty-${item.dish.id}-${m}`}>{item.qty[m]}</Text>
                  <Pressable onPress={() => setLineQty(item.key, m, item.qty[m] + 1)} hitSlop={8} style={styles.stepBtn} testID={`inc-${item.dish.id}-${m}`} accessibilityRole="button" accessibilityLabel={`Increase ${MODE_LABEL[m]} quantity of ${item.dish.name}`}>
                    <Ionicons name="add" size={16} color={colors.ink} />
                  </Pressable>
                </View>
              </View>
            ))}
            </View>
            <View style={styles.lineTotal}>
              <Text style={type.small}>{lineTotalQty(item.qty)} × RM {item.dish.price.toFixed(2)}</Text>
              <Text style={styles.lineTotalValue}>RM {(item.dish.price * lineTotalQty(item.qty)).toFixed(2)}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.summaryRow}>
          <Text style={[type.bodyMuted, styles.summaryLabel]}>Subtotal</Text>
          <Text style={[type.body, styles.summaryValue]}>RM {subtotal.toFixed(2)}</Text>
        </View>
        {hasDelivery && (
          <View style={styles.summaryRow}>
            <Text style={[type.bodyMuted, styles.summaryLabel]}>Delivery fee (once, for delivery items)</Text>
            <Text style={[type.body, styles.summaryValue]}>RM {deliveryFee.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.totalBar}>
          <View style={{ flexShrink: 0 }}>
            <Text style={type.small}>Total</Text>
            <Text style={styles.totalValue} testID="cart-total">RM {total.toFixed(2)}</Text>
          </View>
          <Pressable style={[ui.buttonAccent, { flex: 1 }]} onPress={() => navigation.navigate("Checkout")} testID="to-checkout" accessibilityRole="button" accessibilityLabel="Proceed to checkout">
            <Text style={ui.buttonAccentText}>Proceed to checkout</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xl },
  line: { ...ui.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  lineTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  trashBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chiliSoft, alignItems: "center", justifyContent: "center" },
  // The three ways to get this dish, as a small grouped list with a stepper on each row.
  modes: { borderRadius: radius.md, backgroundColor: colors.paperDim, overflow: "hidden" },
  modeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, paddingLeft: spacing.md, paddingRight: 6 },
  modeRowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft },
  modeLabel: { flex: 1, ...font.display, fontSize: 15, color: colors.ink },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", ...shadow.soft },
  qty: { minWidth: 22, textAlign: "center", ...font.displayBold, fontSize: 16, color: colors.ink, fontVariant: ["tabular-nums"] },
  lineTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lineTotalValue: { ...ui.price },
  footer: { paddingHorizontal: layout.gutter, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft, backgroundColor: colors.paper },
  // Label takes the leftover width and wraps; the price keeps its own width so "RM 3.50" never splits.
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md, marginBottom: 6 },
  summaryLabel: { flex: 1 },
  summaryValue: { flexShrink: 0, textAlign: "right", fontVariant: ["tabular-nums"] },
  totalBar: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing.md },
  totalValue: { ...font.displayExtraBold, fontSize: 24, color: colors.ink, letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
  emptyWrap: { flex: 1, justifyContent: "center", paddingHorizontal: layout.gutter, paddingBottom: spacing.xxl },
});
