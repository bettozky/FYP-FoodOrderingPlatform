import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { api, errorText } from "../../../shared/api/client";
import { MODE_ICON, MODE_LABEL, Mode, Order, OrderItem } from "../../../shared/api/types";
import Badge from "../../../shared/components/Badge";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { mmss, useCountdown } from "../../../shared/util/format";
import { colors, layout, radius, spacing, type, ui, font } from "../../../shared/theme/theme";
import { useLive } from "../LiveDataContext";
import ChatButtons from "../../chat/ChatButton";
import { itemBadge, orderBadge } from "../orderStatus";
import { useReorder } from "../useReorder";
import OrderProgress from "../OrderProgress";
import { OrderSteps } from "../components/OrderSteps";
import OnMyWayCard from "../../arrival/OnMyWayCard";

function Waiting({ order }: { order: Order }) {
  const { t } = useTranslation();
  const s = useCountdown(order.respondBy);
  return (
    <View style={styles.banner} testID="awaiting-banner">
      <Ionicons name="hourglass" size={20} color={colors.turmericDeep} />
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>{t("track.waitingFor", { name: order.merchantName })}</Text>
        <Text style={type.bodyMuted}>{t("track.waitingText", { time: mmss(s) })}</Text>
      </View>
    </View>
  );
}

// Small card: the paying itself happens on the Pay screen (card, FPX or cash).
function PayCard({ order, onPay }: { order: Order; onPay: () => void }) {
  const { t } = useTranslation();
  const s = useCountdown(order.payBy ?? 0);
  return (
    <View style={[styles.banner, { backgroundColor: colors.herbLight, flexDirection: "column" }]} testID="pay-panel">
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Ionicons name="checkmark-circle" size={20} color={colors.herb} />
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{t("track.confirmed", { name: order.merchantName })}</Text>
          <Text style={[type.bodyMuted, s < 60 && { color: colors.chiliText }]}>{t("pay.within", { time: mmss(s) })}</Text>
        </View>
      </View>
      <PrimaryButton label={t("pay.payAmount", { amount: `RM ${order.total.toFixed(2)}` })} onPress={onPay} testID="open-pay" style={{ alignSelf: "stretch" }} />
    </View>
  );
}

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orders, refresh } = useLive();
  const { t } = useTranslation();
  const order = orders.find((o) => o.id === route.params?.orderId);
  const [rating, setRating] = useState<{ item: OrderItem; stars: number; comment: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const { reorder, busyId } = useReorder(navigation);

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title={t("track.order")} />
        <View style={styles.wrap}><Text style={type.bodyMuted}>{t("pay.loading")}</Text></View>
      </View>
    );
  }

  const badge = orderBadge(order);
  // Where the order is in Request -> Stall confirms -> Pay. Declined, expired or cancelled orders have no step bar.
  const stepCurrent: 0 | 1 | 2 | 3 | null =
    order.status === "awaiting_merchant" ? 1 : order.status === "awaiting_payment" ? 2 : ["rejected", "expired", "cancelled"].includes(order.status) ? null : 3;
  const modes = (["dine_in", "takeaway", "delivery"] as Mode[]).filter((m) => order.items.some((i) => i.mode === m));
  const deliveryActive = order.items.some((i) => i.mode === "delivery" && ["handed_over", "delivered"].includes(i.status));
  const readyModes = (["dine_in", "takeaway"] as const).filter((m) => order.items.some((i) => i.mode === m && i.status === "ready"));

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const decide = (choice: "continue" | "cancel") => act(() => api("POST", `/orders/${order.id}/decision`, { choice }));
  const cancelRequest = () => act(() => api("POST", `/orders/${order.id}/cancel`));
  const collect = (mode: "dine_in" | "takeaway") => act(() => api("POST", `/orders/${order.id}/collected`, { mode }));
  const sendReview = () =>
    rating &&
    act(async () => {
      await api("POST", `/orders/${order.id}/reviews`, { dishId: rating.item.dishId, rating: rating.stars, comment: rating.comment.trim() || undefined });
      setRating(null);
    });

  const endedText =
    order.status === "rejected" ? t("track.declined") : order.cancelReason === "not_paid" ? t("track.payRanOut") : t("track.noReply");
  const totalLabel =
    order.paymentMethod === "cash" ? (order.cashReceivedAt ? t("track.paidCash") : t("track.payAtStall")) : order.paidAt ? t("track.paid") : t("cart.total");
  const methodNote =
    order.paymentMethod === "card" ? t("track.paidCard") : order.paymentMethod === "fpx" ? t("track.paidFpx") : order.cashReceivedAt ? t("track.cashReceived") : t("track.cashLater");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("track.orderNo", { id: order.id })} subtitle={order.merchantName} />
      <ScrollView contentContainerStyle={styles.wrap} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Badge label={badge.label} tone={badge.tone} />
        </View>
        {/* Before payment one compact step bar is enough; the full timeline appears once the order is paid. */}
        {stepCurrent !== null && stepCurrent < 3 ? <OrderSteps current={stepCurrent} /> : <OrderProgress order={order} />}

        {/* Feature 2 (Nathan): "I'm 5 min away" for dine-in / takeaway food. Hides itself when it does not apply. */}
        <OnMyWayCard order={order} onChange={refresh} />

        {order.status === "awaiting_merchant" && <Waiting order={order} />}
        {order.status === "awaiting_payment" && <PayCard order={order} onPay={() => navigation.navigate("Pay", { orderId: order.id })} />}
        {(order.status === "awaiting_merchant" || order.status === "awaiting_payment") && (
          <PrimaryButton label={t("track.cancelRequest")} variant="outline" onPress={cancelRequest} disabled={busy} testID="cancel-request" />
        )}

        {order.decision === "pending" && (
          <View style={[styles.banner, { backgroundColor: colors.amberSoft }]}>
            <Ionicons name="alert-circle" size={20} color={colors.turmericDeep} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={type.h3}>{t("track.outOfStock")}</Text>
              <PrimaryButton label={t("track.continueWithout")} onPress={() => decide("continue")} loading={busy} />
              <PrimaryButton label={t("track.cancelRefund")} variant="outline" onPress={() => decide("cancel")} disabled={busy} />
            </View>
          </View>
        )}

        {(order.status === "rejected" || order.status === "expired") && (
          <View style={[styles.banner, { backgroundColor: colors.chiliSoft }]}>
            <Ionicons name="close-circle" size={20} color={colors.chili} />
            <Text style={[type.body, { flex: 1 }]}>
              {endedText} {t("track.notCharged")}
            </Text>
          </View>
        )}

        {readyModes.map((m) => (
          <View key={m} style={[styles.banner, { backgroundColor: colors.herbLight }]}>
            <Ionicons name="restaurant" size={20} color={colors.herb} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={type.h3}>{t("track.ready", { mode: MODE_LABEL[m].toLowerCase() })}</Text>
              <PrimaryButton label={t("track.collected")} onPress={() => collect(m)} loading={busy} />
            </View>
          </View>
        ))}

        {modes.map((m) => (
          <View key={m} style={styles.group}>
            <View style={styles.groupHead}>
              <Ionicons name={MODE_ICON[m] as any} size={15} color={colors.turmericDeep} />
              <Text style={styles.groupTitle}>{MODE_LABEL[m]}</Text>
            </View>
            {order.items.filter((i) => i.mode === m).map((i) => {
              const b = itemBadge(i, order.status);
              const canRate = ["collected", "delivered"].includes(i.status) && !order.reviewedDishIds.includes(i.dishId);
              return (
                <View key={i.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.body}>{i.qty}x {i.name}</Text>
                    {i.options.length ? <Text style={type.small}>{i.options.join(", ")}</Text> : null}
                    {canRate && (
                      <Pressable onPress={() => setRating({ item: i, stars: 5, comment: "" })} testID={`rate-${i.dishId}`}>
                        <Text style={styles.rateLink}>{t("track.rateDish")}</Text>
                      </Pressable>
                    )}
                    {order.reviewedDishIds.includes(i.dishId) && ["collected", "delivered"].includes(i.status) && <Text style={type.small}>{t("track.thanksReview")}</Text>}
                  </View>
                  <Badge label={b.label} tone={b.tone} />
                </View>
              );
            })}
            {m === "delivery" && order.deliveryAddress && <Text style={type.small}>{t("track.to", { address: order.deliveryAddress.line })}</Text>}
            {m === "delivery" && (
              deliveryActive ? (
                <Pressable style={styles.liveRow} onPress={() => navigation.navigate("LiveTracking", { orderId: order.id, destination: order.deliveryAddress })} testID="track-live">
                  <Ionicons name="navigate" size={14} color={colors.turmericDeep} />
                  <Text style={styles.liveText}>{t("track.trackRider")}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.turmericDeep} />
                </Pressable>
              ) : (
                order.status === "preparing" && <Text style={type.small}>{t("track.riderLater")}</Text>
              )
            )}
          </View>
        ))}

        <Text style={[ui.sectionTitle, { marginTop: spacing.lg }]}>{t("track.payment")}</Text>
        <View style={styles.card}>
          <View style={styles.line}><Text style={type.bodyMuted}>{t("cart.subtotal")}</Text><Text style={type.body}>RM {order.subtotal.toFixed(2)}</Text></View>
          {order.deliveryFee > 0 && <View style={styles.line}><Text style={type.bodyMuted}>{t("checkout.deliveryFee")}</Text><Text style={type.body}>RM {order.deliveryFee.toFixed(2)}</Text></View>}
          {order.discount > 0 && <View style={styles.line}><Text style={type.bodyMuted}>{t("checkout.voucher")}</Text><Text style={type.body}>– RM {order.discount.toFixed(2)}</Text></View>}
          <View style={styles.line}><Text style={type.h3}>{totalLabel}</Text><Text style={type.h3}>RM {order.total.toFixed(2)}</Text></View>
          {order.paymentMethod && <Text style={type.small} testID="pay-method-note">{methodNote}</Text>}
          {order.refunded > 0 && <View style={styles.line}><Text style={[type.body, { color: colors.herb }]}>{order.paymentMethod === "cash" ? t("track.deducted") : t("track.refunded")}</Text><Text style={[type.body, { color: colors.herb }]} testID="refunded">RM {order.refunded.toFixed(2)}</Text></View>}
        </View>

        {!["rejected", "expired", "cancelled", "completed"].includes(order.status) && (
          <View style={styles.card}>
            <Text style={type.h3}>{t("track.contact", { name: order.merchantName })}</Text>
            <ChatButtons kind="order" id={order.id} allowCall />
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {!["awaiting_merchant", "awaiting_payment", "preparing"].includes(order.status) && (
          <PrimaryButton label={busyId === order.id ? t("track.addingToCart") : t("orders.again")} onPress={() => reorder(order)} disabled={busyId === order.id} testID="reorder" style={{ marginBottom: spacing.sm }} />
        )}
        <PrimaryButton label={t("home.backHome")} variant="outline" onPress={() => navigation.popTo("MainTabs")} />
      </View>

      <Modal visible={!!rating} transparent animationType="fade" onRequestClose={() => setRating(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={type.h2}>{t("track.rateTitle", { name: rating?.item.name ?? "" })}</Text>
            <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginVertical: spacing.md }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => rating && setRating({ ...rating, stars: n })} testID={`star-${n}`}>
                  <Ionicons name={rating && n <= rating.stars ? "star" : "star-outline"} size={32} color={colors.turmeric} />
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} value={rating?.comment ?? ""} onChangeText={(v) => rating && setRating({ ...rating, comment: v })} placeholder={t("track.commentOptional")} placeholderTextColor={colors.textFaint} multiline />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={t("track.submitReview")} onPress={sendReview} loading={busy} />
            <PrimaryButton label={t("track.notNow")} variant="outline" onPress={() => setRating(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, paddingBottom: 150, gap: spacing.md },
  banner: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: colors.amberTint, borderWidth: 1, borderColor: colors.amberBorder, padding: spacing.lg, borderRadius: radius.lg },
  group: { ...ui.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupTitle: { ...font.displayBold, fontSize: 15, color: colors.amberText },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rateLink: { ...font.displayBold, fontSize: 14, color: colors.amberText, marginTop: 2 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.paperDim, borderRadius: radius.md, minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  liveText: { flex: 1, ...font.display, fontSize: 14, color: colors.amberText },
  card: { ...ui.card, borderRadius: radius.lg, padding: spacing.lg, gap: 8 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  error: { color: colors.chiliText, ...font.display, fontSize: 14 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: layout.gutter, paddingTop: spacing.md, backgroundColor: colors.paper, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, minHeight: 88, ...font.serif, fontSize: 16, borderWidth: 1, borderColor: colors.stoneLine, textAlignVertical: "top" },
});
