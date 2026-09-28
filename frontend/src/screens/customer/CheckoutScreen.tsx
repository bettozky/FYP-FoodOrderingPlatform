import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useCart } from "../../context/CartContext";
import ScreenHeader from "../../components/ScreenHeader";
import PrimaryButton from "../../components/PrimaryButton";
import { colors, radius, spacing, type } from "../../theme/theme";

const payments = [
  { id: "card", label: "Visa •••• 4242", sub: "via Stripe", icon: "💳" },
  { id: "tng", label: "Touch 'n Go eWallet", sub: "Linked", icon: "📱" },
  { id: "cash", label: "Cash on collection", sub: "Pay at counter", icon: "💵" },
];

export default function CheckoutScreen({ route, navigation }: any) {
  const { mode, total } = route.params;
  const { lines, clearCart } = useCart();
  const [payment, setPayment] = useState("card");
  const [placing, setPlacing] = useState(false);

  const handlePlaceOrder = () => {
    setPlacing(true);
    setTimeout(() => {
      setPlacing(false);
      clearCart();
      navigation.reset({
        index: 1,
        routes: [{ name: "MainTabs" }, { name: "OrderTracking" }],
      });
    }, 900);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Checkout" subtitle={`${mode} order`} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={type.h3}>Order summary</Text>
        <View style={styles.card}>
          {lines.map((l) => (
            <View key={l.dish.id} style={styles.summaryLine}>
              <Text style={type.body}>
                {l.qty}x {l.dish.name}
              </Text>
              <Text style={type.body}>RM {(l.dish.price * l.qty).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.summaryLine, { marginTop: spacing.sm }]}>
            <Text style={type.h3}>Total</Text>
            <Text style={type.h3}>RM {total.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={[type.h3, { marginTop: spacing.xl }]}>Payment method</Text>
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {payments.map((p) => {
            const active = p.id === payment;
            return (
              <Pressable key={p.id} onPress={() => setPayment(p.id)} style={[styles.paymentRow, active && styles.paymentRowActive]}>
                <Text style={{ fontSize: 22 }}>{p.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{p.label}</Text>
                  <Text style={type.small}>{p.sub}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]} />
              </Pressable>
            );
          })}
        </View>

        <Text style={[type.h3, { marginTop: spacing.xl }]}>{mode === "Delivery" ? "Delivery address" : "Pickup details"}</Text>
        <View style={styles.card}>
          <Text style={type.body}>
            {mode === "Delivery" ? "Block D, Student Residence, Room 214" : "Canteen A, self-collect at stall counter"}
          </Text>
          <Text style={type.bodyMuted}>{mode === "Delivery" ? "Handled via Lalamove integration" : "Ready in ~15 min"}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={`Place order · RM ${total.toFixed(2)}`} loading={placing} onPress={handlePlaceOrder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 120 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  summaryLine: { flexDirection: "row", justifyContent: "space-between" },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
