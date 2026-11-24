import React, { useState } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { api, errorText } from "../../../shared/api/client";
import { MODE_LABEL, Mode, Order, OrderItem } from "../../../shared/api/types";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { confirmAsync } from "../../../shared/util/confirm";
import { mmss, useCountdown } from "../../../shared/util/format";
import { colors, radius, spacing, type, font, layout, ui } from "../../../shared/theme/theme";
import { useLive } from "../LiveDataContext";
import ChatButtons from "../../chat/ChatButton";
import ArrivingBadge from "../../arrival/ArrivingBadge";
import i18n, { locale } from "../../../shared/i18n";
import { useTranslation } from "react-i18next";

type Tone = "primary" | "warning" | "success" | "neutral";
const ORDER_BADGE: Record<Order["status"], { label: string; tone: Tone }> = {
  awaiting_merchant: { get label() { return i18n.t("orders.new"); }, tone: "warning" },
  awaiting_payment: { get label() { return i18n.t("orders.awaitingPay"); }, tone: "warning" },
  preparing: { get label() { return i18n.t("orders.preparing"); }, tone: "primary" },
  completed: { get label() { return i18n.t("orders.completed"); }, tone: "success" },
  rejected: { get label() { return i18n.t("orders.rejected"); }, tone: "neutral" },
  expired: { get label() { return i18n.t("orders.expired"); }, tone: "neutral" },
  cancelled: { get label() { return i18n.t("orders.cancelled"); }, tone: "neutral" },
};
const ITEM_BADGE: Record<OrderItem["status"], { label: string; tone: Tone }> = {
  preparing: { get label() { return i18n.t("orders.preparing"); }, tone: "primary" },
  ready: { get label() { return i18n.t("orders.ready"); }, tone: "success" },
  collected: { get label() { return i18n.t("orders.collected"); }, tone: "success" },
  handed_over: { get label() { return i18n.t("orders.withRider"); }, tone: "primary" },
  delivered: { get label() { return i18n.t("orders.delivered"); }, tone: "success" },
  out_of_stock: { get label() { return i18n.t("orders.outOfStock"); }, tone: "warning" },
  cancelled: { get label() { return i18n.t("orders.cancelled"); }, tone: "neutral" },
};

function Timer({ deadline }: { deadline: number }) {
  const s = useCountdown(deadline);
  return <Text style={styles.timer}><Ionicons name="timer-outline" size={14} /> {i18n.t("orders.toConfirm", { time: mmss(s) })}</Text>;
}

function PayTimer({ deadline }: { deadline: number }) {
  const s = useCountdown(deadline);
  return <Text style={styles.timer}><Ionicons name="card-outline" size={14} /> {i18n.t("orders.waitPay", { time: mmss(s) })}</Text>;
}

function OrderCard({ order, onChange }: { order: Order; onChange: () => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [buzzed, setBuzzed] = useState("");
  const b = ORDER_BADGE[order.status];
  const modes = (["dine_in", "takeaway", "delivery"] as Mode[]).filter((m) => order.items.some((i) => i.mode === m));

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChange();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function outOfStock(i: OrderItem) {
    const ok = await confirmAsync(t("orders.oosTitle"), t("orders.oosBody", { name: i.name }), t("orders.oosOk"));
    if (ok) act(() => api("POST", `/merchant/orders/${order.id}/items/${i.id}/out-of-stock`));
  }

  return (
    <View style={styles.card} testID={`morder-${order.id}`}>
      <View style={styles.rowBetween}>
        <Text style={type.h3}>#{order.id}</Text>
        <Badge label={b.label} tone={b.tone} />
      </View>
      <Text style={type.bodyMuted}>{order.customerName} · {new Date(order.createdAt).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</Text>
      {/* Feature 2 (Nathan): customer tapped "I'm 5 min away" */}
      <ArrivingBadge arrivingAt={order.arrivingAt} active={order.status === "awaiting_payment" || order.status === "preparing"} />
      {order.status === "awaiting_merchant" && <Timer deadline={order.respondBy} />}
      {order.status === "awaiting_payment" && order.payBy && <PayTimer deadline={order.payBy} />}
      {order.decision === "pending" && <Text style={styles.warn}>{t("orders.waitDecision")}</Text>}

      {modes.map((m) => (
        <View key={m} style={styles.group}>
          <View style={styles.rowBetween}>
            <Text style={styles.groupHead}>{MODE_LABEL[m]}</Text>
            {order.status === "preparing" && m !== "delivery" && order.items.some((i) => i.mode === m && i.status === "preparing") && (
              <Pressable style={styles.smallBtn} disabled={busy} onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/ready`, { mode: m }))} testID={`ready-${m}`}>
                <Text style={styles.smallBtnText}>{t("orders.markReady", { mode: MODE_LABEL[m].toLowerCase() })}</Text>
              </Pressable>
            )}
            {/* Sprint 3 pickup buzzer: ring the customer's phone again if they have not come to collect */}
            {m !== "delivery" && order.items.some((i) => i.mode === m && i.status === "ready") && (
              <Pressable
                style={[styles.smallBtn, styles.buzzBtn]}
                disabled={busy}
                onPress={() => act(async () => { const r = await api<{ buzzCount: number }>("POST", `/merchant/orders/${order.id}/buzz`, { mode: m }); setBuzzed(t("orders.buzzed", { n: r.buzzCount })); })}
                accessibilityLabel={t("orders.buzzA11y", { mode: MODE_LABEL[m].toLowerCase() })}
                testID={`buzz-${m}`}
              >
                <Ionicons name="notifications" size={13} color={colors.ink} />
                <Text style={[styles.smallBtnText, { color: colors.ink }]}>{buzzed || t("orders.buzzAgain")}</Text>
              </Pressable>
            )}
            {order.status === "preparing" && m === "delivery" && order.items.some((i) => i.mode === m && i.status === "preparing") && (
              <Pressable style={styles.smallBtn} disabled={busy} onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/handover`))} testID="handover">
                <Text style={styles.smallBtnText}>{t("orders.handover")}</Text>
              </Pressable>
            )}
          </View>
          {order.items.filter((i) => i.mode === m).map((i) => {
            const ib = ITEM_BADGE[i.status];
            return (
              <View key={i.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{i.qty}x {i.name}</Text>
                  {i.options.length ? <Text style={type.small}>{i.options.join(", ")}</Text> : null}
                </View>
                <Badge label={ib.label} tone={ib.tone} />
                {order.status === "preparing" && i.status === "preparing" && (
                  <Pressable onPress={() => outOfStock(i)} disabled={busy} style={styles.oosBtn} testID={`oos-${i.id}`}>
                    <Text style={styles.oosText}>{t("orders.outOfStock")}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {m === "delivery" && order.deliveryAddress && <Text style={type.small}>{t("orders.to", { line: order.deliveryAddress.line })}</Text>}
        </View>
      ))}

      <View style={styles.rowBetween}>
        <Text style={type.h3}>RM {order.total.toFixed(2)}</Text>
        {order.refunded > 0 && <Text style={type.small}>{order.paymentMethod === "cash" ? t("orders.deducted", { amount: order.refunded.toFixed(2) }) : t("orders.refunded", { amount: order.refunded.toFixed(2) })}</Text>}
      </View>

      {order.paymentMethod && (
        <Text style={type.small} testID="pay-method">
          {order.paymentMethod === "card" ? t("orders.paidCard") : order.paymentMethod === "fpx" ? t("orders.paidFpx") : order.cashReceivedAt ? t("orders.cashReceived") : t("orders.cashCollect", { amount: (order.cashDue ?? order.total).toFixed(2) })}
        </Text>
      )}
      {order.paymentMethod === "cash" && !order.cashReceivedAt && ["preparing", "completed"].includes(order.status) && (
        <PrimaryButton label={t("orders.cashReceivedBtn", { amount: (order.cashDue ?? order.total).toFixed(2) })} variant="success" loading={busy} testID="cash-received" onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/cash-received`))} />
      )}

      {["awaiting_merchant", "awaiting_payment", "preparing"].includes(order.status) && <ChatButtons kind="order" id={order.id} allowCall />}

      {order.status === "awaiting_merchant" && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <PrimaryButton label={t("orders.reject")} variant="danger" style={{ flex: 1 }} disabled={busy} onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/respond`, { accept: false }))} />
          <PrimaryButton label={t("orders.confirm")} variant="success" style={{ flex: 2 }} loading={busy} onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/respond`, { accept: true }))} />
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export default function MerchantOrderQueueScreen() {
  const { orders, refresh } = useLive();
  const { t: tr } = useTranslation();
  const [tab, setTab] = useState<"active" | "done">("active");
  const active = orders.filter((o) => o.status === "awaiting_merchant" || o.status === "awaiting_payment" || o.status === "preparing");
  const shown = tab === "active" ? active : orders.filter((o) => !active.includes(o));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={tr("drawer.orders")} subtitle={tr("orders.activeCount", { n: active.length })} />
      <View style={styles.seg}>
        {(["active", "done"] as const).map((t) => (
          <Pressable key={t} style={[styles.segBtn, tab === t && styles.segOn]} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <Text style={[styles.segText, tab === t && ui.segTextOn]}>{t === "active" ? tr("orders.active") : tr("orders.history")}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title={tab === "active" ? tr("orders.noActive") : tr("orders.noPast")} hint={tab === "active" ? tr("orders.noActiveHint") : tr("orders.noPastHint")} />}
        renderItem={({ item }) => <OrderCard order={item} onChange={refresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xxl * 1.5, width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" },
  seg: { ...ui.segTrack, marginHorizontal: layout.gutter, marginBottom: spacing.md },
  segBtn: { ...ui.segItem },
  segOn: { ...ui.segItemOn },
  segText: { ...ui.segText },
  card: { ...ui.card, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  group: { backgroundColor: colors.paperDim, borderRadius: radius.sm, padding: spacing.md, gap: spacing.sm },
  groupHead: { ...font.displayBold, fontSize: 14, color: colors.amberText },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  smallBtn: { backgroundColor: colors.ink, minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  smallBtnText: { color: colors.white, ...font.displayBold, fontSize: 14 },
  buzzBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.turmeric },
  oosBtn: { minHeight: 32, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.chiliBorder, backgroundColor: colors.chiliSoft },
  oosText: { color: colors.chiliText, ...font.displayBold, fontSize: 13 },
  timer: { ...font.displayBold, fontSize: 14, color: colors.amberText, fontVariant: ["tabular-nums"] },
  warn: { ...font.display, color: colors.amberText, fontSize: 14 },
  error: { color: colors.chiliText, ...font.display, fontSize: 14 },
});
