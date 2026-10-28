import React, { useEffect, useRef, useState } from "react";
import { Modal, Platform, StyleSheet, Text, Vibration, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../shared/api/client";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { colors, fonts, radius, spacing, type } from "../../shared/theme/theme";
import { navRef } from "../../navigation/navRef";
import { useLive } from "../ordering/LiveDataContext";

// App-wide pop-ups, shown on top of whatever screen the customer is on:
//  1. "Your food is ready - please collect" (FR-2.7): phone vibrates and the pop-up stays until collection is confirmed.
//  2. Out-of-stock decision (FR-2.5): continue with a partial order, or cancel for a full refund.
//  3. Everything else (order accepted / rejected / expired, reservation results, reminders ...).
// "order_accepted" has no pop-up any more: the top banner and the Pay bar show it (they read the order itself).
const SILENT_TYPES = ["out_of_stock", "order_accepted"];

export default function GlobalPopups() {
  const { notifications, orders, ack, refresh, setBookingsView } = useLive();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const foodReady = notifications.find((n) => n.type === "food_ready");
  const decisionOrder = orders.find((o) => o.decision === "pending" && o.status === "preparing");
  const generic = notifications.find((n) => n.type !== "food_ready" && !SILENT_TYPES.includes(n.type));
  // keep showing the last notice's text while the modal fades out (otherwise the card flashes empty)
  const lastGeneric = useRef(generic);
  if (generic) lastGeneric.current = generic;
  const shownGeneric = generic ?? lastGeneric.current;

  // order_accepted notices are only marked as read; the banner is driven by the order status.
  const acked = useRef(new Set<string>());
  useEffect(() => {
    for (const n of notifications) {
      if (n.type === "order_accepted" && !acked.current.has(n.id)) {
        acked.current.add(n.id);
        ack(n.id);
      }
    }
  }, [notifications]);

  // Buzz until the customer confirms collection. (No-op in a browser.)
  useEffect(() => {
    if (!foodReady || Platform.OS === "web") return;
    Vibration.vibrate([0, 700, 500], true);
    return () => Vibration.cancel();
  }, [foodReady?.id]);

  async function confirmCollected() {
    if (!foodReady) return;
    setBusy(true);
    setError("");
    try {
      await api("POST", `/orders/${foodReady.data?.orderId}/collected`, { mode: foodReady.data?.mode });
      await ack(foodReady.id);
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function decide(choice: "continue" | "cancel") {
    if (!decisionOrder) return;
    setBusy(true);
    setError("");
    try {
      await api("POST", `/orders/${decisionOrder.id}/decision`, { choice });
      for (const n of notifications) if (n.type === "out_of_stock" && n.data?.orderId === decisionOrder.id) await ack(n.id);
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const oosItems = decisionOrder?.items.filter((i) => i.status === "out_of_stock") ?? [];
  const refundIfPartial = oosItems.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <>
      <Modal visible={!!foodReady} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.backdrop}>
          <View style={styles.card} testID="food-ready-popup">
            <View style={[styles.icon, { backgroundColor: colors.herbLight }]}>
              <Ionicons name="restaurant" size={30} color={colors.herb} />
            </View>
            <Text style={styles.title}>Your food is ready!</Text>
            <Text style={styles.body}>{foodReady?.body ?? "Please collect it from the counter."}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="I've collected my food" onPress={confirmCollected} loading={busy} style={{ alignSelf: "stretch" }} />
            <Text style={styles.hint}>This stays on screen until you confirm.</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={!foodReady && !!decisionOrder} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.backdrop}>
          <View style={styles.card} testID="out-of-stock-popup">
            <View style={[styles.icon, { backgroundColor: colors.amberSoft }]}>
              <Ionicons name="alert-circle" size={30} color={colors.turmericDeep} />
            </View>
            <Text style={styles.title}>Item out of stock</Text>
            <Text style={styles.body}>
              {decisionOrder?.merchantName} ran out of {oosItems.map((i) => `${i.qty}x ${i.name}`).join(", ")}.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={`Continue without it (refund RM ${refundIfPartial.toFixed(2)})`} onPress={() => decide("continue")} loading={busy} style={{ alignSelf: "stretch" }} />
            <PrimaryButton label="Cancel order for a full refund" variant="outline" onPress={() => decide("cancel")} disabled={busy} style={{ alignSelf: "stretch" }} />
          </View>
        </View>
      </Modal>

      <Modal visible={!foodReady && !decisionOrder && !!generic} transparent animationType="fade" onRequestClose={() => generic && ack(generic.id)}>
        <View style={styles.backdrop}>
          <View style={styles.card} testID="notice-popup">
            <View style={[styles.icon, { backgroundColor: colors.paperDim }]}>
              <Ionicons name="notifications" size={28} color={colors.ink} />
            </View>
            <Text style={styles.title}>{shownGeneric?.title}</Text>
            <Text style={styles.body}>{shownGeneric?.body}</Text>
            {shownGeneric?.type === "reservation_accepted" ? (
              <>
                <PrimaryButton label="Pay now" testID="notice-pay-res" onPress={() => { if (generic) ack(generic.id); setBookingsView("mine"); if (navRef.isReady()) navRef.navigate("MainTabs", { tab: "book", nonce: Date.now() }); }} style={{ alignSelf: "stretch" }} />
                <PrimaryButton label="Later" variant="outline" onPress={() => generic && ack(generic.id)} style={{ alignSelf: "stretch" }} />
              </>
            ) : (
              <PrimaryButton label="OK" onPress={() => generic && ack(generic.id)} style={{ alignSelf: "stretch" }} />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 380, backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, alignItems: "center", gap: spacing.md },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  title: { ...type.h2, textAlign: "center" },
  body: { ...type.body, textAlign: "center", color: colors.stone },
  hint: { fontFamily: fonts.serif, fontSize: 12, color: colors.stone },
  error: { fontFamily: fonts.display, color: colors.chili, textAlign: "center" },
});
