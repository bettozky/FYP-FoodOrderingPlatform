import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../CartContext";
import { useCatalog } from "../../discovery/CatalogContext";
import { useLive } from "../LiveDataContext";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { api, errorText } from "../../../shared/api/client";
import { MODE_LABEL, Mode, Order, Voucher } from "../../../shared/api/types";
import { ADDRESS_PRESETS } from "../../../shared/data/mockData";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";

const DELIVERY_FEE = 3.5; // display only; the server calculates the real total

export function formatCard(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

export default function CheckoutScreen({ navigation }: any) {
  const { lines, merchant, subtotal, hasDelivery, clearCart } = useCart();
  const { address, setAddress } = useCatalog();
  const { refresh } = useLive();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherId, setVoucherId] = useState<string>("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ vouchers: Voucher[] }>("GET", "/vouchers").then((r) => setVouchers(r.vouchers)).catch(() => {});
  }, []);

  const eligible = useMemo(
    () =>
      vouchers.filter(
        (v) =>
          (!v.merchantId || v.merchantId === merchant?.id) &&
          subtotal >= v.minSpend &&
          (!v.requireCategory || lines.some((l) => l.dish.category === v.requireCategory))
      ),
    [vouchers, subtotal, lines, merchant]
  );
  useEffect(() => {
    if (voucherId && !eligible.some((v) => v.id === voucherId)) setVoucherId("");
  }, [eligible, voucherId]);

  const voucher = eligible.find((v) => v.id === voucherId);
  const discount = voucher ? Math.min(voucher.amount, subtotal) : 0;
  const deliveryFee = hasDelivery ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee - discount;

  if (!merchant || lines.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Checkout" />
        <View style={styles.wrap}><Text style={type.bodyMuted}>Your cart is empty.</Text></View>
      </View>
    );
  }

  async function placeOrder() {
    if (!merchant) return;
    setPlacing(true);
    setError("");
    try {
      const items = lines.flatMap((l) =>
        (["delivery", "dine_in", "takeaway"] as Mode[])
          .filter((m) => l.qty[m] > 0)
          .map((m) => ({ dishId: l.dish.id, mode: m, qty: l.qty[m], options: l.options }))
      );
      const r = await api<{ order: Order }>("POST", "/orders", {
        merchantId: merchant.id,
        items,
        address: hasDelivery ? { label: address.label, line: note.trim() ? `${address.line} (${note.trim()})` : address.line, lat: address.lat, lng: address.lng } : undefined,
        voucherId: voucherId || undefined,
      });
      clearCart();
      await refresh();
      navigation.reset({ index: 1, routes: [{ name: "MainTabs" }, { name: "OrderTracking", params: { orderId: r.order.id } }] });
    } catch (e) {
      setError(errorText(e)); // the cart is kept so the customer can retry
    } finally {
      setPlacing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Checkout" subtitle={merchant.name} />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={type.h3}>Order summary</Text>
        <View style={styles.card}>
          {(["dine_in", "takeaway", "delivery"] as Mode[]).map((m) => {
            const part = lines.filter((l) => l.qty[m] > 0);
            if (!part.length) return null;
            return (
              <View key={m} style={{ gap: 4 }}>
                <Text style={styles.modeHead}>{MODE_LABEL[m]}</Text>
                {part.map((l) => (
                  <View key={l.key + m} style={styles.summaryLine}>
                    <Text style={[type.body, styles.summaryLabel]}>{l.qty[m]}x {l.dish.name}</Text>
                    <Text style={[type.body, styles.summaryValue]}>RM {(l.dish.price * l.qty[m]).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            );
          })}
          <View style={styles.divider} />
          <View style={styles.summaryLine}><Text style={[type.bodyMuted, styles.summaryLabel]}>Subtotal</Text><Text style={[type.body, styles.summaryValue]}>RM {subtotal.toFixed(2)}</Text></View>
          {hasDelivery && <View style={styles.summaryLine}><Text style={[type.bodyMuted, styles.summaryLabel]}>Delivery fee</Text><Text style={[type.body, styles.summaryValue]}>RM {deliveryFee.toFixed(2)}</Text></View>}
          {discount > 0 && <View style={styles.summaryLine}><Text style={[type.bodyMuted, styles.summaryLabel]}>Voucher</Text><Text style={[type.body, styles.summaryValue, { color: colors.herb }]}>– RM {discount.toFixed(2)}</Text></View>}
          <View style={styles.summaryLine}><Text style={[type.h3, styles.summaryLabel]}>Total</Text><Text style={[type.h3, styles.summaryValue]} testID="checkout-total">RM {total.toFixed(2)}</Text></View>
        </View>

        {hasDelivery && (
          <>
            <Text style={[type.h3, { marginTop: spacing.xl }]}>Delivery address</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {ADDRESS_PRESETS.map((a) => {
                const on = a.line === address.line;
                return (
                  <Pressable key={a.line} onPress={() => setAddress(a)} style={[styles.option, on && styles.optionOn]}>
                    <Ionicons name="location" size={16} color={on ? colors.turmericDeep : colors.stone} />
                    <Text style={[type.body, { flex: 1 }]}>{a.line}</Text>
                    <View style={[styles.radio, on && styles.radioOn]} />
                  </Pressable>
                );
              })}
              <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Room / notes for the rider (optional)" placeholderTextColor={colors.textFaint} />
            </View>
          </>
        )}

        <Text style={[type.h3, { marginTop: spacing.xl }]}>Voucher</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Pressable onPress={() => setVoucherId("")} style={[styles.option, !voucherId && styles.optionOn]}>
            <Text style={[type.body, { flex: 1 }]}>No voucher</Text>
            <View style={[styles.radio, !voucherId && styles.radioOn]} />
          </Pressable>
          {eligible.map((v) => (
            <Pressable key={v.id} onPress={() => setVoucherId(v.id)} style={[styles.option, voucherId === v.id && styles.optionOn]} testID={`voucher-${v.id}`}>
              <Ionicons name="pricetag" size={16} color={colors.turmericDeep} />
              <View style={{ flex: 1 }}>
                <Text style={type.body}>{v.title}</Text>
                <Text style={type.small}>{v.description}</Text>
              </View>
              <View style={[styles.radio, voucherId === v.id && styles.radioOn]} />
            </Pressable>
          ))}
          {eligible.length === 0 && <Text style={type.small}>No voucher applies to this order yet.</Text>}
        </View>

        <Text style={[type.h3, { marginTop: spacing.xl }]}>How it works</Text>
        <View style={styles.card}>
          <Text style={type.body}>1. {merchant.name} gets your order request straight away and has 10 minutes to confirm it.</Text>
          <Text style={type.body}>2. Once they confirm, you pay by card. You are not charged before that.</Text>
          <Text style={type.small}>You can chat or call the restaurant from the order screen while you wait. If they decline or don't reply, nothing is charged.</Text>
        </View>

        {error ? (
          <View style={styles.errorBox} testID="checkout-error">
            <Ionicons name="alert-circle" size={16} color={colors.chili} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={`Send order to restaurant · RM\u00A0${total.toFixed(2)}`} loading={placing} onPress={placeOrder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 140 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: 8 },
  modeHead: { fontFamily: fonts.displayBold, fontSize: 12, color: colors.turmericDeep, textTransform: "uppercase", letterSpacing: 0.6 },
  // Name/label wraps in the leftover width; the amount never wraps or collides with the name.
  summaryLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  summaryLabel: { flex: 1 },
  summaryValue: { flexShrink: 0, textAlign: "right" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  input: { backgroundColor: colors.paper, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, fontFamily: fonts.serif, color: colors.text, borderWidth: 1, borderColor: colors.border },
  errorBox: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: colors.chiliSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  errorText: { flex: 1, color: colors.chili, fontFamily: fonts.display, fontSize: 13 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
