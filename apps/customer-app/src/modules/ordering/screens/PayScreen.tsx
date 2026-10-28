import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorText } from "../../../shared/api/client";
import { MODE_LABEL } from "../../../shared/api/types";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { mmss, rm, useCountdown } from "../../../shared/util/format";
import { colors, fonts, radius, spacing, type, ui } from "../../../shared/theme/theme";
import { useLive } from "../LiveDataContext";
import { OrderSteps } from "../components/OrderSteps";
import { PayMethod } from "../payments";
import { formatCard } from "./CheckoutScreen";

type Bank = { id: string; name: string };
const FALLBACK_BANKS: Bank[] = [{ id: "maybank2u", name: "Maybank2u" }, { id: "cimb", name: "CIMB Clicks" }, { id: "pbe", name: "Public Bank" }];

const METHODS: { key: PayMethod; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "card", title: "Card", sub: "Visa or Mastercard", icon: "card-outline" },
  { key: "fpx", title: "FPX online banking", sub: "Pay from your bank account", icon: "business-outline" },
  { key: "cash", title: "Cash at the stall", sub: "Dine-in and takeaway only", icon: "cash-outline" },
];

// Step 3 of an order: the stall has confirmed, now the customer chooses how to pay.
// Opened from the top banner, the Pay bar on Home/Orders, or the small Pay card on the order screen.
export default function PayScreen({ route, navigation }: any) {
  const { orders, refresh } = useLive();
  const insets = useSafeAreaInsets();
  const order = orders.find((o) => o.id === route.params?.orderId);
  const left = useCountdown(order?.payBy);
  const [method, setMethod] = useState<PayMethod>("card");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [banks, setBanks] = useState<Bank[]>(FALLBACK_BANKS);
  const [bank, setBank] = useState("maybank2u");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ banks: Bank[] }>("GET", "/orders/payment-methods")
      .then((r) => r?.banks?.length && setBanks(r.banks))
      .catch(() => {});
  }, []);

  const hasDelivery = !!order?.items.some((i) => i.mode === "delivery");
  useEffect(() => {
    if (hasDelivery && method === "cash") setMethod("card");
  }, [hasDelivery, method]);

  function goToOrder() {
    const id = route.params?.orderId;
    const routes = navigation.getState().routes as any[];
    if (routes.some((r) => r.name === "OrderTracking" && r.params?.orderId === id)) navigation.popTo("OrderTracking", { orderId: id });
    else navigation.replace("OrderTracking", { orderId: id });
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Pay" />
        <View style={styles.wrap}><Text style={type.bodyMuted}>Loading order…</Text></View>
      </View>
    );
  }

  const payable = order.status === "awaiting_payment" && left > 0;
  if (!payable && !busy) {
    const paid = ["preparing", "completed"].includes(order.status);
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title={`Pay #${order.id}`} subtitle={order.merchantName} />
        <View style={styles.wrap}>
          <View style={[styles.note, { backgroundColor: paid ? colors.herbLight : colors.chiliSoft }]} testID="pay-unavailable">
            <Ionicons name={paid ? "checkmark-circle" : "close-circle"} size={20} color={paid ? colors.herb : colors.chili} />
            <Text style={[type.body, { flex: 1 }]}>
              {paid
                ? "This order is already paid. Nothing more to do here."
                : order.status === "awaiting_merchant"
                ? "The stall has not confirmed this order yet. You can pay as soon as it does."
                : "The time to pay has run out, or the order was cancelled. You were not charged."}
            </Text>
          </View>
          <PrimaryButton label="View order" onPress={goToOrder} testID="pay-view-order" />
        </View>
      </View>
    );
  }

  const urgent = left < 60;
  const label = method === "cash" ? "Confirm cash order" : `Pay ${rm(order.total)}`;

  async function pay() {
    setBusy(true);
    setError("");
    try {
      if (method === "fpx") {
        setPhase("Connecting to your bank…");
        await new Promise((r) => setTimeout(r, 1200)); // simulated redirect to the bank
      }
      const body = method === "card" ? { method, card: { number: card } } : method === "fpx" ? { method, bank } : { method };
      await api("POST", `/orders/${order!.id}/pay`, body);
      await refresh();
      goToOrder();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      setPhase("");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={`Pay #${order.id}`} subtitle={order.merchantName} />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <OrderSteps current={2} />

        <View style={[styles.timer, urgent && styles.timerUrgent]} testID="pay-timer" accessibilityLiveRegion="polite">
          <Ionicons name="time-outline" size={18} color={urgent ? colors.chili : colors.herb} />
          <Text style={[styles.timerText, urgent && { color: colors.chili }]}>Pay within {mmss(left)} or the order is cancelled</Text>
        </View>

        <View style={styles.card}>
          <Text style={type.h3}>{order.merchantName}</Text>
          {order.items.map((i) => (
            <View key={i.id} style={styles.line}>
              <Text style={[type.bodyMuted, { flex: 1 }]} numberOfLines={1}>{i.qty}x {i.name} · {MODE_LABEL[i.mode]}</Text>
              <Text style={type.bodyMuted}>{rm(i.price * i.qty)}</Text>
            </View>
          ))}
          {order.deliveryFee > 0 && <View style={styles.line}><Text style={type.bodyMuted}>Delivery fee</Text><Text style={type.bodyMuted}>{rm(order.deliveryFee)}</Text></View>}
          {order.discount > 0 && <View style={styles.line}><Text style={type.bodyMuted}>Voucher</Text><Text style={type.bodyMuted}>– {rm(order.discount)}</Text></View>}
          <View style={[styles.line, styles.totalLine]}><Text style={type.h3}>Total</Text><Text style={type.h3} testID="pay-total">{rm(order.total)}</Text></View>
        </View>

        <Text style={ui.sectionTitle}>Payment method</Text>
        {METHODS.map((m) => {
          const disabled = m.key === "cash" && hasDelivery;
          const on = method === m.key;
          return (
            <Pressable
              key={m.key}
              style={[styles.method, on && styles.methodOn, disabled && { opacity: 0.5 }]}
              disabled={disabled || busy}
              onPress={() => { setMethod(m.key); setError(""); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled }}
              accessibilityLabel={m.title}
              testID={`method-${m.key}`}
            >
              <Ionicons name={m.icon} size={22} color={colors.ink} />
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>{m.title}</Text>
                <Text style={type.small}>{disabled ? "Not available when the order has delivery" : m.sub}</Text>
              </View>
              <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.herb : colors.stone} />
            </Pressable>
          );
        })}

        {method === "card" && (
          <View style={styles.detail}>
            <TextInput style={styles.input} value={card} onChangeText={(t) => setCard(formatCard(t))} keyboardType="number-pad" placeholder="Card number" placeholderTextColor={colors.textFaint} testID="pay-card" />
            <Text style={type.small}>Stripe (simulated). Test cards: 4242 4242 4242 4242 succeeds · 4000 0000 0000 0002 is declined.</Text>
          </View>
        )}
        {method === "fpx" && (
          <View style={styles.detail}>
            <Text style={type.small}>Choose your bank. You would be sent to its page to approve (simulated here).</Text>
            <View style={styles.bankWrap}>
              {banks.map((b) => (
                <Pressable key={b.id} style={[ui.chip, bank === b.id && ui.chipOn]} onPress={() => setBank(b.id)} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: bank === b.id }} testID={`bank-${b.id}`}>
                  <Text style={[ui.chipText, bank === b.id && ui.chipTextOn]}>{b.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {method === "cash" && (
          <View style={styles.detail}>
            <Text style={type.body}>Nothing is charged now. Pay <Text style={{ fontFamily: fonts.displayBold }}>{rm(order.total)}</Text> in cash at the stall when you collect. The stall starts preparing right away.</Text>
          </View>
        )}

        {error ? <Text style={styles.error} testID="pay-error">{error}</Text> : null}
        {phase ? <Text style={type.small} testID="pay-phase">{phase}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <PrimaryButton label={label} onPress={pay} loading={busy} testID="pay-button" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 140, gap: spacing.md },
  note: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", padding: spacing.lg, borderRadius: radius.lg },
  timer: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.herbLight, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  timerUrgent: { backgroundColor: colors.chiliSoft },
  timerText: { flex: 1, fontFamily: fonts.displayBold, fontSize: 13.5, color: colors.herb },
  card: { ...ui.card, borderRadius: radius.lg, padding: spacing.lg, gap: 6 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  totalLine: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  method: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  methodOn: { borderColor: colors.herb, backgroundColor: colors.herbLight },
  methodTitle: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
  detail: { gap: spacing.sm, paddingHorizontal: 2 },
  bankWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  input: { backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.serif, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.chili, fontFamily: fonts.display },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.border },
});
