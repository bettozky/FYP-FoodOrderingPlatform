import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { api, errorText } from "../../../shared/api/client";
import { Dish, Reservation } from "../../../shared/api/types";
import { prettyDate } from "../../../shared/util/format";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { useCatalog } from "../../discovery/CatalogContext";
import { useLive } from "../../ordering/LiveDataContext";

const DEPOSIT = 5; // display only; the server charges the real amount (assumption: RM5 booking deposit)

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function slotsFor(open: string, close: string) {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  let start = oh * 60 + om;
  let end = ch * 60 + cm;
  if (end <= start) end += 24 * 60; // hours that pass midnight
  const out: string[] = [];
  for (let t = start; t <= end - 30; t += 30) out.push(`${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`);
  return out;
}

// New booking: BookTable { merchantId }.  Change a booking (FR-3.5): BookTable { reservation }.
export default function BookTableScreen({ route, navigation }: any) {
  const existing: Reservation | undefined = route.params?.reservation;
  const merchantId: string = existing?.merchantId ?? route.params?.merchantId;
  const { merchantById } = useCatalog();
  const { refresh, setBookingsView } = useLive();
  const merchant = merchantById[merchantId];

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return ymd(d); }), []);
  const [date, setDate] = useState(existing?.date ?? days[0]);
  const [time, setTime] = useState(existing?.time ?? "");
  const [party, setParty] = useState(existing?.partySize ?? 2);
  const [request, setRequest] = useState(existing?.specialRequest ?? "");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [pre, setPre] = useState<Record<string, number>>({});
  const [payNow, setPayNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ dishes: Dish[] }>("GET", `/dishes?merchantId=${merchantId}`).then((r) => setDishes(r.dishes)).catch(() => {});
  }, [merchantId]);

  if (!merchant) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }}><ScreenHeader title="Book a table" /></View>;
  }

  const slots = slotsFor(merchant.hours.open, merchant.hours.close).filter((t) => {
    const at = new Date(`${date}T${t}:00`).getTime();
    return at >= Date.now() + 20 * 60 * 1000;
  });
  const preLines = dishes.filter((d) => pre[d.id] > 0);
  const preTotal = preLines.reduce((s, d) => s + d.price * pre[d.id], 0);
  const payAmount = DEPOSIT + preTotal;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (!time) throw new Error("Choose a time slot");
      if (existing) {
        await api("PATCH", `/reservations/${existing.id}`, { date, time, partySize: party, specialRequest: request });
      } else {
        await api("POST", "/reservations", {
          merchantId, date, time, partySize: party, specialRequest: request.trim() || undefined,
          preorder: preLines.map((d) => ({ dishId: d.id, qty: pre[d.id] })),
          payNow,
        });
      }
      await refresh();
      setBookingsView("mine");
      navigation.popTo("MainTabs", { tab: "book", nonce: Date.now() });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={existing ? "Change booking" : "Book a table"} subtitle={merchant.name} />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={type.h3}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {days.map((d) => (
            <Pressable key={d} style={[styles.chip, date === d && styles.chipOn]} onPress={() => { setDate(d); setTime(""); }} testID={`date-${d}`}>
              <Text style={[styles.chipText, date === d && { color: colors.white }]}>{prettyDate(d)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[type.h3, { marginTop: spacing.lg }]}>Time slot</Text>
        <Text style={type.small}>{merchant.name} is open {merchant.hours.open}-{merchant.hours.close}</Text>
        <View style={[styles.row, { flexWrap: "wrap", marginTop: spacing.sm }]}>
          {slots.map((t) => (
            <Pressable key={t} style={[styles.chip, time === t && styles.chipOn]} onPress={() => setTime(t)} testID={`slot-${t}`}>
              <Text style={[styles.chipText, time === t && { color: colors.white }]}>{t}</Text>
            </Pressable>
          ))}
          {slots.length === 0 && <Text style={type.bodyMuted}>No slots left on this day. Try another date.</Text>}
        </View>

        <View style={styles.partyRow}>
          <Text style={type.h3}>Party size</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setParty((p) => Math.max(1, p - 1))}><Ionicons name="remove" size={16} color={colors.ink} /></Pressable>
            <Text style={styles.stepVal} testID="party">{party}</Text>
            <Pressable style={styles.stepBtn} onPress={() => setParty((p) => Math.min(20, p + 1))}><Ionicons name="add" size={16} color={colors.ink} /></Pressable>
          </View>
        </View>

        <TextInput style={styles.input} value={request} onChangeText={setRequest} placeholder="Special request (optional)" placeholderTextColor={colors.textFaint} />

        {!existing && (
          <>
            <Text style={[type.h3, { marginTop: spacing.xl }]}>Pre-order (optional)</Text>
            <Text style={type.small}>The restaurant approves or declines the pre-order separately from the table.</Text>
            {dishes.filter((d) => !d.soldOut).map((d) => (
              <View key={d.id} style={styles.dishRow}>
                <Text style={{ fontSize: 24 }}>{d.image}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{d.name}</Text>
                  <Text style={type.small}>RM {d.price.toFixed(2)}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => setPre((p) => ({ ...p, [d.id]: Math.max(0, (p[d.id] ?? 0) - 1) }))}><Ionicons name="remove" size={14} color={colors.ink} /></Pressable>
                  <Text style={styles.stepVal} testID={`pre-${d.id}`}>{pre[d.id] ?? 0}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setPre((p) => ({ ...p, [d.id]: Math.min(20, (p[d.id] ?? 0) + 1) }))} testID={`pre-add-${d.id}`}><Ionicons name="add" size={14} color={colors.ink} /></Pressable>
                </View>
              </View>
            ))}

            <Text style={[type.h3, { marginTop: spacing.xl }]}>Payment</Text>
            {([false, true] as const).map((v) => (
              <Pressable key={String(v)} style={[styles.option, payNow === v && styles.optionOn]} onPress={() => setPayNow(v)} testID={v ? "pay-now" : "pay-later"}>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{v ? `Pay online · RM ${payAmount.toFixed(2)}` : "Pay later"}</Text>
                  <Text style={type.small}>{v ? `RM ${DEPOSIT.toFixed(2)} booking deposit${preTotal ? ` + RM ${preTotal.toFixed(2)} pre-order` : ""}. Nothing is charged now. You pay after the restaurant confirms your table.` : "Pay at the restaurant. Nothing is charged today."}</Text>
                </View>
                <View style={[styles.radio, payNow === v && styles.radioOn]} />
              </Pressable>
            ))}
          </>
        )}
        {existing && <Text style={[type.small, { marginTop: spacing.md }]}>Changing the date, time or party size sends the booking back to the restaurant for approval.</Text>}

        {error ? <Text style={styles.error} testID="book-error">{error}</Text> : null}
        <Text style={[type.small, { marginTop: spacing.md }]}>The restaurant has 30 minutes to reply. You'll be told if it's accepted, declined or expires.</Text>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label={existing ? "Save changes" : "Request table"} onPress={submit} loading={busy} disabled={!time} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 140 },
  row: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  partyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg, marginBottom: spacing.md },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  stepVal: { fontFamily: fonts.displayBold, fontSize: 16, minWidth: 18, textAlign: "center" },
  input: { backgroundColor: colors.paper, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, fontFamily: fonts.serif, color: colors.text, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm },
  dishRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  error: { color: colors.chili, fontFamily: fonts.display, marginTop: spacing.md },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
