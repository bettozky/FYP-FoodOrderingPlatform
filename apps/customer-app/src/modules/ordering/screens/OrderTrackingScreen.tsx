import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../../shared/api/client";
import { MODE_ICON, MODE_LABEL, Mode, Order, OrderItem } from "../../../shared/api/types";
import Badge from "../../../shared/components/Badge";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { mmss, useCountdown } from "../../../shared/util/format";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { useLive } from "../LiveDataContext";
import { itemBadge, orderBadge } from "../orderStatus";

function Waiting({ order }: { order: Order }) {
  const s = useCountdown(order.respondBy);
  return (
    <View style={styles.banner} testID="awaiting-banner">
      <Ionicons name="hourglass" size={20} color={colors.turmericDeep} />
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>Waiting for {order.merchantName}</Text>
        <Text style={type.bodyMuted}>They have {mmss(s)} left to accept. If they don't answer, your order is cancelled and refunded automatically.</Text>
      </View>
    </View>
  );
}

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orders, refresh } = useLive();
  const order = orders.find((o) => o.id === route.params?.orderId);
  const [rating, setRating] = useState<{ item: OrderItem; stars: number; comment: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Order" />
        <View style={styles.wrap}><Text style={type.bodyMuted}>Loading order…</Text></View>
      </View>
    );
  }

  const badge = orderBadge(order);
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
  const collect = (mode: "dine_in" | "takeaway") => act(() => api("POST", `/orders/${order.id}/collected`, { mode }));
  const sendReview = () =>
    rating &&
    act(async () => {
      await api("POST", `/orders/${order.id}/reviews`, { dishId: rating.item.dishId, rating: rating.stars, comment: rating.comment.trim() || undefined });
      setRating(null);
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={`Order #${order.id}`} subtitle={order.merchantName} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Badge label={badge.label} tone={badge.tone} />
        </View>

        {order.status === "awaiting_merchant" && <Waiting order={order} />}

        {order.decision === "pending" && (
          <View style={[styles.banner, { backgroundColor: "#F3E4C4" }]}>
            <Ionicons name="alert-circle" size={20} color={colors.turmericDeep} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={type.h3}>An item is out of stock</Text>
              <PrimaryButton label="Continue without it" onPress={() => decide("continue")} loading={busy} />
              <PrimaryButton label="Cancel for a full refund" variant="outline" onPress={() => decide("cancel")} disabled={busy} />
            </View>
          </View>
        )}

        {(order.status === "rejected" || order.status === "expired") && (
          <View style={[styles.banner, { backgroundColor: "#F1DAD6" }]}>
            <Ionicons name="close-circle" size={20} color={colors.chili} />
            <Text style={[type.body, { flex: 1 }]}>
              {order.status === "rejected" ? "The restaurant rejected this order." : "The restaurant did not reply in time."} You were refunded RM {order.refunded.toFixed(2)}.
            </Text>
          </View>
        )}

        {readyModes.map((m) => (
          <View key={m} style={[styles.banner, { backgroundColor: colors.herbLight }]}>
            <Ionicons name="restaurant" size={20} color={colors.herb} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={type.h3}>Your {MODE_LABEL[m].toLowerCase()} food is ready - please collect</Text>
              <PrimaryButton label="I've collected it" onPress={() => collect(m)} loading={busy} />
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
              const b = itemBadge(i);
              const canRate = ["collected", "delivered"].includes(i.status) && !order.reviewedDishIds.includes(i.dishId);
              return (
                <View key={i.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.body}>{i.qty}x {i.name}</Text>
                    {i.options.length ? <Text style={type.small}>{i.options.join(", ")}</Text> : null}
                    {canRate && (
                      <Pressable onPress={() => setRating({ item: i, stars: 5, comment: "" })} testID={`rate-${i.dishId}`}>
                        <Text style={styles.rateLink}>★ Rate this dish</Text>
                      </Pressable>
                    )}
                    {order.reviewedDishIds.includes(i.dishId) && ["collected", "delivered"].includes(i.status) && <Text style={type.small}>✓ Thanks for your review</Text>}
                  </View>
                  <Badge label={b.label} tone={b.tone} />
                </View>
              );
            })}
            {m === "delivery" && order.deliveryAddress && <Text style={type.small}>To: {order.deliveryAddress.line}</Text>}
            {m === "delivery" && (
              deliveryActive ? (
                <Pressable style={styles.liveRow} onPress={() => navigation.navigate("LiveTracking", { orderId: order.id, destination: order.deliveryAddress })} testID="track-live">
                  <Ionicons name="navigate" size={14} color={colors.turmericDeep} />
                  <Text style={styles.liveText}>Track the rider live</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.turmericDeep} />
                </Pressable>
              ) : (
                order.status === "preparing" && <Text style={type.small}>The rider is assigned once the restaurant hands over your delivery items.</Text>
              )
            )}
          </View>
        ))}

        <Text style={[type.h2, { fontSize: 17, marginTop: spacing.lg }]}>Payment</Text>
        <View style={styles.card}>
          <View style={styles.line}><Text style={type.bodyMuted}>Subtotal</Text><Text style={type.body}>RM {order.subtotal.toFixed(2)}</Text></View>
          {order.deliveryFee > 0 && <View style={styles.line}><Text style={type.bodyMuted}>Delivery fee</Text><Text style={type.body}>RM {order.deliveryFee.toFixed(2)}</Text></View>}
          {order.discount > 0 && <View style={styles.line}><Text style={type.bodyMuted}>Voucher</Text><Text style={type.body}>– RM {order.discount.toFixed(2)}</Text></View>}
          <View style={styles.line}><Text style={type.h3}>Paid</Text><Text style={type.h3}>RM {order.total.toFixed(2)}</Text></View>
          {order.refunded > 0 && <View style={styles.line}><Text style={[type.body, { color: colors.herb }]}>Refunded</Text><Text style={[type.body, { color: colors.herb }]} testID="refunded">RM {order.refunded.toFixed(2)}</Text></View>}
        </View>

        {order.merchantPhone && order.status !== "rejected" && order.status !== "expired" && (
          <Pressable style={styles.liveRow} onPress={() => Linking.openURL(`tel:${order.merchantPhone!.replace(/\s/g, "")}`)}>
            <Ionicons name="call" size={14} color={colors.turmericDeep} />
            <Text style={styles.liveText}>Call {order.merchantName}</Text>
          </Pressable>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Back to home" variant="outline" onPress={() => navigation.popTo("MainTabs")} />
      </View>

      <Modal visible={!!rating} transparent animationType="fade" onRequestClose={() => setRating(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={type.h2}>Rate {rating?.item.name}</Text>
            <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginVertical: spacing.md }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => rating && setRating({ ...rating, stars: n })} testID={`star-${n}`}>
                  <Ionicons name={rating && n <= rating.stars ? "star" : "star-outline"} size={32} color={colors.turmeric} />
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} value={rating?.comment ?? ""} onChangeText={(t) => rating && setRating({ ...rating, comment: t })} placeholder="Add a comment (optional)" placeholderTextColor={colors.textFaint} multiline />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Submit review" onPress={sendReview} loading={busy} />
            <PrimaryButton label="Not now" variant="outline" onPress={() => setRating(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  banner: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md },
  group: { backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupTitle: { fontFamily: fonts.displayBold, fontSize: 12, color: colors.turmericDeep, textTransform: "uppercase", letterSpacing: 0.6 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rateLink: { fontFamily: fonts.displayBold, fontSize: 12.5, color: colors.turmericDeep, marginTop: 2 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.paperDim, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  liveText: { flex: 1, fontFamily: fonts.display, fontSize: 13, color: colors.turmericDeep },
  card: { backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 6 },
  line: { flexDirection: "row", justifyContent: "space-between" },
  error: { color: colors.chili, fontFamily: fonts.display },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, minHeight: 70, fontFamily: fonts.serif, fontSize: 15, borderWidth: 1, borderColor: colors.border, textAlignVertical: "top" },
});
