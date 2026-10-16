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
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";
import { useLive } from "../LiveDataContext";

type Tone = "primary" | "warning" | "success" | "neutral";
const ORDER_BADGE: Record<Order["status"], { label: string; tone: Tone }> = {
  awaiting_merchant: { label: "New - answer now", tone: "warning" },
  preparing: { label: "Preparing", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  rejected: { label: "Rejected", tone: "neutral" },
  expired: { label: "Missed (refunded)", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};
const ITEM_BADGE: Record<OrderItem["status"], { label: string; tone: Tone }> = {
  preparing: { label: "Preparing", tone: "primary" },
  ready: { label: "Ready - waiting for customer", tone: "success" },
  collected: { label: "Collected", tone: "success" },
  handed_over: { label: "With rider", tone: "primary" },
  delivered: { label: "Delivered", tone: "success" },
  out_of_stock: { label: "Out of stock", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

function Timer({ deadline }: { deadline: number }) {
  const s = useCountdown(deadline);
  return <Text style={styles.timer}><Ionicons name="timer-outline" size={14} /> {mmss(s)} to accept</Text>;
}

function OrderCard({ order, onChange }: { order: Order; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
    const ok = await confirmAsync("Mark out of stock?", `${i.name} will be marked sold out and the customer will be asked to continue without it or cancel for a full refund.`, "Mark out of stock");
    if (ok) act(() => api("POST", `/merchant/orders/${order.id}/items/${i.id}/out-of-stock`));
  }

  return (
    <View style={styles.card} testID={`morder-${order.id}`}>
      <View style={styles.rowBetween}>
        <Text style={type.h3}>#{order.id}</Text>
        <Badge label={b.label} tone={b.tone} />
      </View>
      <Text style={type.bodyMuted}>{order.customerName} · {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
      {order.status === "awaiting_merchant" && <Timer deadline={order.respondBy} />}
      {order.decision === "pending" && <Text style={styles.warn}>Waiting for the customer to decide about the out-of-stock item…</Text>}

      {modes.map((m) => (
        <View key={m} style={styles.group}>
          <View style={styles.rowBetween}>
            <Text style={styles.groupHead}>{MODE_LABEL[m]}</Text>
            {order.status === "preparing" && m !== "delivery" && order.items.some((i) => i.mode === m && i.status === "preparing") && (
              <Pressable style={styles.smallBtn} disabled={busy} onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/ready`, { mode: m }))} testID={`ready-${m}`}>
                <Text style={styles.smallBtnText}>Mark {MODE_LABEL[m].toLowerCase()} ready</Text>
              </Pressable>
            )}
            {order.status === "preparing" && m === "delivery" && order.items.some((i) => i.mode === m && i.status === "preparing") && (
              <Pressable style={styles.smallBtn} disabled={busy} onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/handover`))} testID="handover">
                <Text style={styles.smallBtnText}>Hand over to rider</Text>
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
                    <Text style={styles.oosText}>Out of stock</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {m === "delivery" && order.deliveryAddress && <Text style={type.small}>To: {order.deliveryAddress.line}</Text>}
        </View>
      ))}

      <View style={styles.rowBetween}>
        <Text style={type.h3}>RM {order.total.toFixed(2)}</Text>
        {order.refunded > 0 && <Text style={type.small}>Refunded RM {order.refunded.toFixed(2)}</Text>}
      </View>

      {order.status === "awaiting_merchant" && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <PrimaryButton label="Reject" variant="danger" style={{ flex: 1 }} disabled={busy} onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/respond`, { accept: false }))} />
          <PrimaryButton label="Accept" variant="success" style={{ flex: 2 }} loading={busy} onPress={() => act(() => api("POST", `/merchant/orders/${order.id}/respond`, { accept: true }))} />
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export default function MerchantOrderQueueScreen() {
  const { orders, refresh } = useLive();
  const [tab, setTab] = useState<"active" | "done">("active");
  const active = orders.filter((o) => o.status === "awaiting_merchant" || o.status === "preparing");
  const shown = tab === "active" ? active : orders.filter((o) => !active.includes(o));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Incoming orders" subtitle={`${active.length} active`} />
      <View style={styles.seg}>
        {(["active", "done"] as const).map((t) => (
          <Pressable key={t} style={[styles.segBtn, tab === t && styles.segOn]} onPress={() => setTab(t)}>
            <Text style={[styles.segText, tab === t && { color: colors.white }]}>{t === "active" ? "Active" : "History"}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title={tab === "active" ? "No active orders" : "No past orders yet"} hint={tab === "active" ? "New paid orders pop up here automatically, with an alert sound." : "Completed orders will be listed here."} />}
        renderItem={({ item }) => <OrderCard order={item} onChange={refresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  seg: { flexDirection: "row", backgroundColor: colors.paperDim, borderRadius: radius.pill, padding: 3, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  group: { backgroundColor: colors.paperDim, borderRadius: radius.sm, padding: spacing.sm, gap: 6 },
  groupHead: { fontFamily: fonts.displayBold, fontSize: 11, color: colors.turmericDeep, textTransform: "uppercase", letterSpacing: 0.6 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  smallBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill },
  smallBtnText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 12 },
  oosBtn: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.chili },
  oosText: { color: colors.chili, fontFamily: fonts.displayBold, fontSize: 11 },
  timer: { fontFamily: fonts.displayBold, color: colors.turmericDeep },
  warn: { fontFamily: fonts.display, color: colors.turmericDeep, fontSize: 13 },
  error: { color: colors.chili, fontFamily: fonts.display },
});
