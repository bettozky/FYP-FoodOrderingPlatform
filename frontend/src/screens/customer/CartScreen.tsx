import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useCart } from "../../context/CartContext";
import ScreenHeader from "../../components/ScreenHeader";
import PrimaryButton from "../../components/PrimaryButton";
import { colors, radius, spacing, type } from "../../theme/theme";

const modes = ["Dine-in", "Takeaway", "Delivery"] as const;

export default function CartScreen({ navigation }: any) {
  const { lines, incrementLine, decrementLine, removeLine, subtotal } = useCart();
  const [mode, setMode] = useState<(typeof modes)[number]>("Delivery");

  const deliveryFee = mode === "Delivery" ? 3.5 : 0;
  const total = subtotal + deliveryFee;

  if (lines.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Your cart" />
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={type.h3}>Your cart is empty</Text>
          <Text style={type.bodyMuted}>Search a dish you're craving to get started.</Text>
          <PrimaryButton
            label="Browse dishes"
            style={{ marginTop: spacing.lg }}
            onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Your cart" subtitle={`${lines.length} item${lines.length > 1 ? "s" : ""}`} />

      <FlatList
        data={lines}
        keyExtractor={(l) => l.dish.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.line}>
            <Text style={styles.lineEmoji}>{item.dish.image}</Text>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{item.dish.name}</Text>
              <Text style={type.bodyMuted}>RM {item.dish.price.toFixed(2)}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => decrementLine(item.dish.id)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>–</Text>
              </Pressable>
              <Text style={styles.qty}>{item.qty}</Text>
              <Pressable onPress={() => incrementLine(item.dish.id)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.modeRow}>
            {modes.map((m) => {
              const active = m === mode;
              return (
                <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeChip, active && styles.modeChipActive]}>
                  <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={type.bodyMuted}>Subtotal</Text>
          <Text style={type.body}>RM {subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={type.bodyMuted}>{mode === "Delivery" ? "Delivery fee" : "Service fee"}</Text>
          <Text style={type.body}>RM {deliveryFee.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: 4 }]}>
          <Text style={type.h3}>Total</Text>
          <Text style={type.h3}>RM {total.toFixed(2)}</Text>
        </View>
        <PrimaryButton
          label="Proceed to checkout"
          style={{ marginTop: spacing.md }}
          onPress={() => navigation.navigate("Checkout", { mode, total })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  modeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  modeChipText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  modeChipTextActive: { color: colors.primaryDark },
  line: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineEmoji: { fontSize: 32 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: -1 },
  qty: { minWidth: 18, textAlign: "center", fontWeight: "700" },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: spacing.xl },
});
