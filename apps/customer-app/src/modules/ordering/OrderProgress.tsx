import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Order } from "../../shared/api/types";
import { colors, fonts, radius, spacing, type, ui } from "../../shared/theme/theme";

// A vertical "where is my order?" timeline (inspired by the wireframes' Order Progress screen).
// Every step is DERIVED from fields the order already has, so nothing here is invented.
// Only two steps have a real timestamp (request sent, paid); the others show state only.
type StepState = "done" | "current" | "todo";
type Step = { label: string; state: StepState; time?: number };

const LIVE_ITEM = ["ready", "collected", "handed_over", "delivered"];

export function progressSteps(o: Order): Step[] | null {
  // Declined / expired / cancelled orders already get their own banner, so no timeline for them.
  if (["rejected", "expired", "cancelled"].includes(o.status)) return null;

  const items = o.items.filter((i) => i.status !== "cancelled" && i.status !== "out_of_stock");
  const completed = o.status === "completed";
  const anyAhead = o.items.some((i) => LIVE_ITEM.includes(i.status));
  const allAhead = items.length > 0 && items.every((i) => LIVE_ITEM.includes(i.status));

  const flags: { label: string; done: boolean; time?: number }[] = [
    { label: "Request sent", done: true, time: o.createdAt },
    { label: "Restaurant confirmed", done: o.status !== "awaiting_merchant" },
    { label: "Payment received", done: o.status === "preparing" || completed, time: o.paidAt },
    { label: "Preparing your food", done: anyAhead || completed },
    { label: "Ready or on the way", done: allAhead || completed },
    { label: "Completed", done: completed },
  ];

  let currentTaken = false;
  return flags.map((f) => {
    if (f.done) return { label: f.label, state: "done" as const, time: f.time };
    if (!currentTaken) {
      currentTaken = true;
      return { label: f.label, state: "current" as const };
    }
    return { label: f.label, state: "todo" as const };
  });
}

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const STATE_TEXT: Record<StepState, string> = { done: "done", current: "in progress", todo: "not yet" };

export default function OrderProgress({ order }: { order: Order }) {
  const steps = progressSteps(order);
  if (!steps) return null;
  return (
    <View style={styles.card} testID="order-progress">
      {steps.map((s, i) => (
        <View key={s.label} style={styles.row} accessible accessibilityLabel={`${s.label}, ${STATE_TEXT[s.state]}`}>
          <View style={styles.rail}>
            <View style={[styles.dot, s.state === "done" && styles.dotDone, s.state === "current" && styles.dotCurrent]}>
              {s.state === "done" && <Ionicons name="checkmark" size={13} color={colors.white} />}
            </View>
            {i < steps.length - 1 && <View style={[styles.line, s.state === "done" && styles.lineDone]} />}
          </View>
          <View style={styles.body}>
            <Text style={[styles.label, s.state === "todo" && { color: colors.stoneText, fontFamily: fonts.serifMedium }]}>{s.label}</Text>
            {s.state === "current" && <Text style={type.small}>In progress</Text>}
            {s.time ? <Text style={type.small}>{clock(s.time)}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, borderRadius: radius.lg, padding: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md, minHeight: 44 },
  rail: { alignItems: "center", width: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: colors.herb, borderColor: colors.herb },
  dotCurrent: { borderColor: colors.turmeric, borderWidth: 5 },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.herb },
  body: { flex: 1, minWidth: 0, paddingBottom: spacing.md, gap: 1 },
  label: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
});
