import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../CartContext";
import { useCatalog, MY_LOCATION_LABEL } from "../../discovery/CatalogContext";
import LocationMap from "../../../shared/location/LocationMap";
import AddressPicker from "../../discovery/components/AddressPicker";
import { useLive } from "../LiveDataContext";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { OrderSteps } from "../components/OrderSteps";
import { api, errorText } from "../../../shared/api/client";
import BusyNotice from "../components/BusyNotice";
import { MODE_LABEL, Mode, Order, Voucher } from "../../../shared/api/types";
import { colors, layout, radius, spacing, type, ui, font } from "../../../shared/theme/theme";
import BudgetWarning from "../../spending/BudgetWarning";

const DELIVERY_FEE = 3.5; // display only; the server calculates the real total

export function formatCard(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

/** iOS-style selection mark: an ink tick in a circle when chosen, an empty ring when not. */
function Radio({ on }: { on: boolean }) {
  return (
    <View style={[styles.radio, on && styles.radioOn]}>
      {on ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
    </View>
  );
}

export default function CheckoutScreen({ navigation }: any) {
  const { lines, merchant, subtotal, hasDelivery, clearCart } = useCart();
  const { addresses, address, setAddress, merchantById, refreshMerchants } = useCatalog();
  const { refresh } = useLive();
  const insets = useSafeAreaInsets();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherId, setVoucherId] = useState<string>("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  // A live pin has to be confirmed before the order goes out. Confirming applies to exactly the spot on the map,
  // so moving the pin or choosing another address asks again.
  const [pickerOpen, setPickerOpen] = useState(false);
  const usingPin = hasDelivery && (address.label === MY_LOCATION_LABEL || !!address.pinned);
  const [pinOk, setPinOk] = useState(false);
  useEffect(() => { setPinOk(false); }, [address.lat, address.lng, address.label]);
  const needsPinOk = usingPin && !pinOk;

  // Sprint 3 busy mode: use the stall's live state (refreshed every 10 s here), not the copy saved in the cart.
  const [acceptWait, setAcceptWait] = useState(false);
  const live = merchant ? merchantById[merchant.id] ?? merchant : undefined;
  const busyBlocked = !!(live && live.openNow && (live.ordersPaused || (live.longWaitWarning && !acceptWait)));
  useEffect(() => {
    refreshMerchants();
    const t = setInterval(refreshMerchants, 10000);
    return () => clearInterval(t);
  }, [refreshMerchants]);

  // A saved address can carry a standing note ("Room 2-14, call on arrival"); start from it.
  useEffect(() => {
    setNote(address.note ?? "");
  }, [address.id, address.note]);

  useEffect(() => {
    api<{ vouchers: Voucher[] }>("GET", "/vouchers").then((r) => setVouchers(r.vouchers)).catch(() => {});
  }, []);

  // Every voucher that belongs to this shop (or to all shops), with why it cannot be picked yet: already used by this
  // customer (shown faded as "Used"), or the basket is not big enough / missing a category.
  const offers = useMemo(() => {
    const list = vouchers
      .filter((v) => !v.merchantId || v.merchantId === merchant?.id)
      .map((v) => {
        const missingCat = v.requireCategory && !lines.some((l) => l.dish.category === v.requireCategory) ? v.requireCategory : "";
        const reason = v.used ? "Used" : subtotal < v.minSpend ? `Spend RM ${(v.minSpend - subtotal).toFixed(2)} more to use this offer` : missingCat ? `Add a ${missingCat} dish to use this offer` : "";
        return { v, reason };
      });
    return [...list.filter((o) => !o.reason), ...list.filter((o) => o.reason && o.v.used !== true), ...list.filter((o) => o.v.used)];
  }, [vouchers, subtotal, lines, merchant]);
  const eligible = useMemo(() => offers.filter((o) => !o.reason).map((o) => o.v), [offers]);
  useEffect(() => {
    if (voucherId && !eligible.some((v) => v.id === voucherId)) setVoucherId("");
  }, [eligible, voucherId]);

  const voucher = eligible.find((v) => v.id === voucherId);
  const discount = voucher ? Math.min(voucher.kind === "percent" ? Math.round(subtotal * voucher.amount) / 100 : voucher.amount, subtotal) : 0;
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
    if (needsPinOk) { setError("Please confirm the delivery pin on the map first."); return; }
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
        acceptLongWait: acceptWait,
      });
      clearCart();
      await refresh();
      navigation.reset({ index: 1, routes: [{ name: "MainTabs" }, { name: "OrderTracking", params: { orderId: r.order.id } }] });
    } catch (e) {
      setError(errorText(e)); // the cart is kept so the customer can retry
      refreshMerchants(); // e.g. the stall paused orders a moment ago: show it straight away
    } finally {
      setPlacing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AddressPicker visible={pickerOpen} initial={address} onClose={() => setPickerOpen(false)} onConfirm={(a) => { setAddress(a); setPickerOpen(false); }} />
      <ScreenHeader title="Checkout" subtitle={merchant.name} />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <OrderSteps current={0} />
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Order summary</Text>
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
          <View style={[styles.divider, { marginTop: 2 }]} />
          <View style={styles.summaryLine}><Text style={[type.h3, styles.summaryLabel, { fontSize: 17 }]}>Total</Text><Text style={[type.h3, styles.summaryValue, styles.totalValue]} testID="checkout-total">RM {total.toFixed(2)}</Text></View>
        </View>
        {/* Sprint 3 weekly budget: warns before this order takes the customer over their limit */}
        <BudgetWarning adding={total} />

        {hasDelivery && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Delivery address</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable style={styles.mapBtn} onPress={() => setPickerOpen(true)} accessibilityRole="button" testID="choose-on-map">
                <Ionicons name="add" size={18} color={colors.ink} />
                <Text style={styles.mapBtnText}>Add address</Text>
              </Pressable>
              {(address.pinned && !addresses.some((a) => a.line === address.line) ? [address, ...addresses] : addresses).map((a) => {
                const on = a.line === address.line;
                return (
                  <Pressable key={a.line} onPress={() => setAddress(a)} style={[styles.option, on && styles.optionOn]}>
                    <Ionicons name="location-outline" size={18} color={on ? colors.ink : colors.stone} />
                    <Text style={[type.body, { flex: 1 }]} numberOfLines={2}>{a.id ? `${a.label} · ${a.line}` : a.line}</Text>
                    <Radio on={on} />
                  </Pressable>
                );
              })}
              {Number.isFinite(address.lat) ? (
                <View style={styles.pinCard} testID="checkout-pin-card">
                  <LocationMap lat={address.lat} lng={address.lng} height={usingPin ? 160 : 110} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Ionicons name="location" size={18} color={colors.ink} />
                    <Text style={[type.body, { flex: 1 }]} numberOfLines={3} testID="checkout-address-line">{address.line}</Text>
                    <Pressable onPress={() => setPickerOpen(true)} hitSlop={12} accessibilityRole="button" testID="change-address"><Text style={styles.changeText}>Change</Text></Pressable>
                  </View>
                  {usingPin ? <Text style={type.small}>The rider will bring your order to this pin. Check it is the right spot, then confirm.</Text> : null}
                  {usingPin ? <Pressable style={styles.confirmRow} onPress={() => setPinOk((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: pinOk }} testID="confirm-pin">
                    <View style={[styles.checkbox, pinOk && styles.checkboxOn]}>{pinOk ? <Ionicons name="checkmark" size={14} color={colors.ink} /> : null}</View>
                    <Text style={[type.body, { flex: 1 }]}>Yes, deliver to this pin</Text>
                  </Pressable> : null}
                </View>
              ) : null}
              <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Room / notes for the rider (optional)" placeholderTextColor={colors.textFaint} />
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Voucher</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Pressable onPress={() => setVoucherId("")} style={[styles.option, !voucherId && styles.optionOn]}>
            <Text style={[type.body, { flex: 1 }]}>No voucher</Text>
            <Radio on={!voucherId} />
          </Pressable>
          {offers.map(({ v, reason }) => (
            <Pressable key={v.id} onPress={() => { if (!reason) setVoucherId(v.id); }} disabled={!!reason} accessibilityState={{ disabled: !!reason }}
              style={[styles.option, voucherId === v.id && styles.optionOn, !!reason && styles.optionOff]} testID={`voucher-${v.id}`}>
              <Ionicons name="pricetag-outline" size={18} color={reason ? colors.stone : colors.amberText} />
              <View style={{ flex: 1 }}>
                <Text style={type.body}>{v.title}</Text>
                <Text style={type.small}>{reason && !v.used ? reason : v.description}</Text>
              </View>
              {v.used ? <View style={styles.usedPill} testID={`voucher-used-${v.id}`}><Text style={styles.usedText}>Used</Text></View> : reason ? <Ionicons name="alert-circle-outline" size={18} color={colors.stone} /> : <Radio on={voucherId === v.id} />}
            </Pressable>
          ))}
          {eligible.length === 0 && <Text style={type.small}>{offers.length ? "No voucher can be used on this order yet." : "No voucher applies to this order yet."}</Text>}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>How it works</Text>
        <View style={[styles.card, styles.howCard]}>
          <Text style={type.body}>1. {merchant.name} gets your order request straight away and has 10 minutes to confirm it.</Text>
          <Text style={type.body}>2. Once they confirm, you pay by card. You are not charged before that.</Text>
          <Text style={type.small}>You can chat or call the restaurant from the order screen while you wait. If they decline or don't reply, nothing is charged.</Text>
        </View>

        {live ? <BusyNotice merchant={live} accepted={acceptWait} onAccept={setAcceptWait} /> : null}

        {error ? (
          <View style={styles.errorBox} testID="checkout-error">
            <Ionicons name="alert-circle" size={18} color={colors.chiliText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Pressable style={[ui.buttonAccent, (placing || needsPinOk || busyBlocked) && styles.ctaOff]} onPress={placeOrder} disabled={placing || needsPinOk || busyBlocked} testID="place-order" accessibilityRole="button" accessibilityLabel="Send order to restaurant" accessibilityState={{ busy: placing, disabled: placing || needsPinOk || busyBlocked }}>
          <Text style={[ui.buttonAccentText, { textAlign: "center" }]} numberOfLines={2}>{placing ? "Sending…" : needsPinOk ? "Confirm your delivery pin to continue" : live?.ordersPaused ? "Orders paused · try again in a few minutes" : busyBlocked ? "Tick \"I'm OK waiting\" to continue" : `Send order to restaurant · RM\u00A0${total.toFixed(2)}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, paddingBottom: 170 },
  sectionTitle: { ...ui.sectionTitle, fontSize: 18 },
  card: { ...ui.card, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, gap: 10 },
  howCard: { backgroundColor: colors.herbLight, borderColor: colors.herbBorder },
  modeHead: { ...font.displayBold, fontSize: 14, color: colors.amberText },
  // Name/label wraps in the leftover width; the amount never wraps or collides with the name.
  summaryLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  summaryLabel: { flex: 1 },
  summaryValue: { flexShrink: 0, textAlign: "right", fontVariant: ["tabular-nums"] },
  totalValue: { ...font.displayExtraBold, fontSize: 19, letterSpacing: -0.2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.stoneSoft, marginVertical: 4 },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, minHeight: 56, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.stoneLine },
  optionOff: { opacity: 0.5 },
  usedPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.paperDim },
  usedText: { ...font.displayBold, fontSize: 12, color: colors.stoneText },
  optionOn: { borderColor: colors.ink, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.stoneSoft, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  mapBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft },
  mapBtnText: { ...font.displayBold, fontSize: 15, color: colors.ink },
  changeText: { ...font.displayBold, fontSize: 15, color: colors.amberText },
  pinCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine, padding: spacing.md, gap: spacing.md, overflow: "hidden" },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.stoneSoft, alignItems: "center", justifyContent: "center" },
  checkboxOn: { borderColor: colors.turmeric, backgroundColor: colors.turmeric },
  input: { backgroundColor: colors.paper, borderRadius: radius.md, paddingHorizontal: spacing.lg, minHeight: 50, paddingVertical: 12, fontSize: 16, ...font.serif, color: colors.text, borderWidth: 1, borderColor: colors.stoneLine },
  errorBox: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: colors.chiliSoft, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  errorText: { flex: 1, color: colors.chiliText, ...font.display, fontSize: 14, lineHeight: 20 },
  ctaOff: { backgroundColor: colors.paperDim },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: layout.gutter, paddingTop: spacing.md, backgroundColor: colors.paper, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft },
});
