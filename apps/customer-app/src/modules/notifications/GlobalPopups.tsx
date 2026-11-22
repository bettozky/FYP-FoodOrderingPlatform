import React, { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../shared/api/client";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { colors, fonts, radius, spacing, type } from "../../shared/theme/theme";
import { navRef } from "../../navigation/navRef";
import { useLive } from "../ordering/LiveDataContext";
import OrderFeedbackFlow from "../feedback/OrderFeedbackFlow";
import PickupBuzzer, { BuzzerMiniBar } from "../pickup/PickupBuzzer";
import { useTranslation } from "react-i18next";

// App-wide pop-ups, shown on top of whatever screen the customer is on:
//  1. "Your food is ready - please collect" (FR-2.7): the full-screen pickup buzzer (Sprint 3, ../pickup/PickupBuzzer).
//     It rings until collection is confirmed; "Show me where" shrinks it to a bar while the map is open.
//  2. Out-of-stock decision (FR-2.5): continue with a partial order, or cancel for a full refund.
//  3. Everything else (order accepted / rejected / expired, reservation results, reminders ...).
// "order_accepted" has no pop-up any more: the top banner and the Pay bar show it (they read the order itself).
// "order_completed" opens "Review your order" and then "Rate the app" instead (../feedback/OrderFeedbackFlow).
const SILENT_TYPES = ["out_of_stock", "order_accepted", "order_completed"];

export default function GlobalPopups() {
  const { t } = useTranslation();
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

  // "Show me where" hides the buzzer (keyed by notice + buzz time, so a new buzz from the stall opens it again).
  const [minimised, setMinimised] = useState("");
  const buzzKey = foodReady ? `${foodReady.id}:${foodReady.data?.buzzedAt ?? ""}` : "";
  const buzzerOpen = !!foodReady && minimised !== buzzKey;

  function showWhere(merchantId?: string) {
    setMinimised(buzzKey);
    if (navRef.isReady()) navRef.navigate("CanteenMap", { merchantId });
  }

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
      <OrderFeedbackFlow blocked={!!foodReady || !!decisionOrder} />
      {foodReady && buzzerOpen ? (
        <PickupBuzzer notice={foodReady} busy={busy} error={error} onCollected={confirmCollected} onShowWhere={showWhere} />
      ) : null}
      {foodReady && !buzzerOpen ? <BuzzerMiniBar notice={foodReady} onOpen={() => setMinimised("")} /> : null}

      <Modal visible={!foodReady && !!decisionOrder} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.backdrop}>
          <View style={styles.card} testID="out-of-stock-popup">
            <View style={[styles.icon, { backgroundColor: colors.amberSoft }]}>
              <Ionicons name="alert-circle" size={30} color={colors.turmericDeep} />
            </View>
            <Text style={styles.title}>{t("popups.oosTitle")}</Text>
            <Text style={styles.body}>
              {t("popups.ranOut", { name: decisionOrder?.merchantName ?? "", items: oosItems.map((i) => `${i.qty}x ${i.name}`).join(", ") })}
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={t("popups.continueRefund", { amount: refundIfPartial.toFixed(2) })} onPress={() => decide("continue")} loading={busy} style={{ alignSelf: "stretch" }} />
            <PrimaryButton label={t("popups.cancelFull")} variant="outline" onPress={() => decide("cancel")} disabled={busy} style={{ alignSelf: "stretch" }} />
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
                <PrimaryButton label={t("popups.payNow")} testID="notice-pay-res" onPress={() => { if (generic) ack(generic.id); setBookingsView("mine"); if (navRef.isReady()) navRef.navigate("MainTabs", { tab: "book", nonce: Date.now() }); }} style={{ alignSelf: "stretch" }} />
                <PrimaryButton label={t("popups.later")} variant="outline" onPress={() => generic && ack(generic.id)} style={{ alignSelf: "stretch" }} />
              </>
            ) : (
              <PrimaryButton label={t("common.ok")} onPress={() => generic && ack(generic.id)} style={{ alignSelf: "stretch" }} />
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
