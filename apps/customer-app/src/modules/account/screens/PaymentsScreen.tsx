import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";

// There is no saved-card feature, so this screen only explains how paying works. Each statement is
// backed by the app/backend: pay-after-confirm (order tracking), simulated Stripe and "card data is
// never stored" (backend/src/modules/payment/payment.service.ts).
const INFO: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: "checkmark-circle", title: "You pay after the restaurant confirms", body: "Your order request goes to the restaurant first. You are only asked to pay once they confirm it, so you are never charged for an order they can't make." },
  { icon: "flask", title: "Test payments only", body: "ScootMeal is a prototype, so payments are simulated with a test card (4242 4242 4242 4242). No real money moves, and card details are checked once and never stored." },
  { icon: "card", title: "No saved cards yet", body: "Saving a card isn't supported, so there is nothing to manage here. You enter the card details when you pay for an order." },
];

export default function PaymentsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Payments" subtitle="How paying works in ScootMeal." />
      <ScrollView contentContainerStyle={styles.wrap}>
        {INFO.map((i) => (
          <View key={i.title} style={styles.card}>
            <View style={styles.icon}><Ionicons name={i.icon} size={20} color={colors.ink} /></View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={type.h3}>{i.title}</Text>
              <Text style={type.bodyMuted}>{i.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
});
