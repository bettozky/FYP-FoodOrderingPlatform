import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";

// Answers describe how the app really behaves (taken from the order/tracking screens). No contact
// details are listed because the app has no support channel to point to.
const FAQ: { q: string; a: string }[] = [
  { q: "How do I place an order?", a: "Add dishes to your cart, choose dine-in, takeaway or delivery for each item, then send the order to the restaurant. The restaurant confirms it, and then you pay." },
  { q: "What if the restaurant doesn't reply?", a: "A request that isn't answered in time is cancelled automatically, and you have not been charged." },
  { q: "What if I don't pay after they confirm?", a: "Unpaid orders are cancelled automatically, so pay from the order screen soon after the restaurant confirms." },
  { q: "Where can I follow my order?", a: "Open the Orders tab and tap an order. It shows a progress timeline, and delivery orders also have a live map." },
  { q: "Can I contact the restaurant?", a: "Yes. Open the order and use the chat button to message the restaurant. In-app calling also needs the full app build, so it may not work in Expo Go." },
  { q: "How do vouchers work?", a: "Pick an eligible voucher on the checkout screen. The Loyalty tab lists the vouchers that are available." },
  { q: "How do loyalty points work?", a: "You get 1 point for every RM 1 paid on completed orders. Refunded amounts do not count." },
  { q: "Is this a real ordering service?", a: "No. ScootMeal is a university project prototype. Payments and delivery tracking are simulated." },
];

export default function HelpScreen() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Help & support" subtitle="Quick answers about ordering." />
      <ScrollView contentContainerStyle={styles.wrap}>
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <Pressable key={f.q} onPress={() => setOpen(on ? null : i)} style={styles.card} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={f.q}>
              <View style={styles.row}>
                <Text style={[type.h3, { flex: 1 }]}>{f.q}</Text>
                <Ionicons name={on ? "chevron-up" : "chevron-down"} size={18} color={colors.ink} />
              </View>
              {on ? <Text style={[type.bodyMuted, { marginTop: spacing.sm }]}>{f.a}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 52, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
