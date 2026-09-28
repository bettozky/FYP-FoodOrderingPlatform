import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { activeOrder, OrderStatus } from "../../data/mockData";
import ScreenHeader from "../../components/ScreenHeader";
import PrimaryButton from "../../components/PrimaryButton";
import { colors, radius, spacing, type } from "../../theme/theme";

const steps: { key: OrderStatus; label: string; icon: string }[] = [
  { key: "placed", label: "Order placed", icon: "📝" },
  { key: "preparing", label: "Preparing", icon: "🍳" },
  { key: "ready", label: "Ready", icon: "🛎️" },
  { key: "on_the_way", label: "Rider on the way", icon: "🛵" },
  { key: "delivered", label: "Delivered", icon: "✅" },
];

export default function OrderTrackingScreen({ navigation }: any) {
  const order = activeOrder;
  const currentIndex = steps.findIndex((s) => s.key === order.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Track order" subtitle={`Order ${order.id}`} showBack={false} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.etaCard}>
          <Text style={type.bodyMuted}>Estimated arrival</Text>
          <Text style={styles.eta}>{order.etaMinutes} min</Text>
          <Text style={type.small}>{order.mode} · from {order.merchantName}</Text>
        </View>

        <View style={styles.stepsWrap}>
          {steps.map((s, i) => {
            const done = i <= currentIndex;
            const isLast = i === steps.length - 1;
            return (
              <View key={s.key} style={styles.stepRow}>
                <View style={styles.stepIconCol}>
                  <View style={[styles.stepDot, done && styles.stepDotDone]}>
                    <Text style={{ fontSize: 14 }}>{s.icon}</Text>
                  </View>
                  {!isLast && <View style={[styles.stepLine, done && i < currentIndex && styles.stepLineDone]} />}
                </View>
                <Text style={[type.body, done ? { color: colors.text, fontWeight: "700" } : { color: colors.textFaint }]}>
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[type.h3, { marginTop: spacing.xl }]}>Order details</Text>
        <View style={styles.card}>
          {order.items.map((it) => (
            <View key={it.dishId} style={styles.summaryLine}>
              <Text style={type.body}>
                {it.qty}x {it.name}
              </Text>
              <Text style={type.body}>RM {(it.price * it.qty).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.summaryLine, { marginTop: spacing.sm }]}>
            <Text style={type.h3}>Total</Text>
            <Text style={type.h3}>RM {order.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Back to home"
          variant="outline"
          onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 120 },
  etaCard: {
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: 2,
  },
  eta: { fontSize: 36, fontWeight: "800", color: colors.secondary },
  stepsWrap: { marginTop: spacing.xl },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 52 },
  stepIconCol: { alignItems: "center", width: 40 },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: { backgroundColor: colors.primarySoft },
  stepLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4, minHeight: 16 },
  stepLineDone: { backgroundColor: colors.primary },
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
