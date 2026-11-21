import ChatButtons from "../../chat/ChatButton";
import React, { useState } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { View, Text, FlatList, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Badge from "../../../shared/components/Badge";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { api, errorText } from "../../../shared/api/client";
import { Reservation } from "../../../shared/api/types";
import { mmss, prettyDate, useCountdown } from "../../../shared/util/format";
import { confirmAsync } from "../../../shared/util/confirm";
import { venueName } from "../../../shared/i18n/labels";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { useCatalog } from "../../discovery/CatalogContext";
import { useLive } from "../../ordering/LiveDataContext";
import { formatCard } from "../../ordering/screens/CheckoutScreen";

export const VENUE_CATEGORIES = ["Trending", "Buffet", "Luxury", "Aesthetic Cafe"];

// `label` is a translation key (book.st*).
const STATUS = {
  awaiting_restaurant: { label: "book.stAwaiting", tone: "warning" },
  awaiting_payment: { label: "book.stPay", tone: "primary" },
  confirmed: { label: "book.stConfirmed", tone: "success" },
  declined: { label: "book.stDeclined", tone: "danger" },
  expired: { label: "book.stExpired", tone: "danger" },
  cancelled: { label: "book.stCancelled", tone: "neutral" },
  completed: { label: "book.stCompleted", tone: "neutral" },
} as const satisfies Record<Reservation["status"], { label: string; tone: "primary" | "success" | "warning" | "danger" | "neutral" }>;
const PRE_TONE = { pending: "warning", approved: "success", declined: "danger" } as const;
const PRE_LABEL = { pending: "book.prePending", approved: "book.preApproved", declined: "book.preDeclined" } as const;

function Waiting({ deadline }: { deadline: number }) {
  const { t } = useTranslation();
  const s = useCountdown(deadline);
  return <Text style={type.small}>{t("book.waiting", { time: mmss(s) })}</Text>;
}

function PayPanel({ r, onPaid }: { r: Reservation; onPaid: () => void }) {
  const { t } = useTranslation();
  const left = useCountdown(r.payBy ?? 0);
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setBusy(true);
    setError("");
    try {
      await api("POST", `/reservations/${r.id}/pay`, { card: { number: card } });
      onPaid();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.payBox} testID={`res-pay-${r.id}`}>
      <Text style={type.h3}>{t("book.confirmedTitle")}</Text>
      <Text style={type.small}>{t("book.payWithin", { amount: r.amountDue.toFixed(2), time: mmss(left) })}</Text>
      <TextInput style={styles.input} value={card} onChangeText={(v) => setCard(formatCard(v))} keyboardType="number-pad" placeholder={t("pay.cardNumber")} placeholderTextColor={colors.textFaint} testID="res-card" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={t("pay.payAmount", { amount: `RM ${r.amountDue.toFixed(2)}` })} onPress={pay} loading={busy} disabled={left <= 0} />
    </View>
  );
}

function ReservationCard({ r, onChange, navigation }: { r: Reservation; onChange: () => void; navigation: any }) {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const slot = new Date(`${r.date}T${r.time}:00+08:00`).getTime();
  const open = r.status === "awaiting_restaurant" || r.status === "awaiting_payment" || r.status === "confirmed";
  const beforeCutoff = slot - Date.now() >= r.cutoffMs;
  const st = STATUS[r.status];

  async function cancel() {
    const ok = await confirmAsync(t("book.cancelTitle"), `${t("book.cancelText", { name: r.merchantName })}${r.paid ? ` ${t("book.refundNote")}` : ""}`, t("book.cancelBooking"));
    if (!ok) return;
    try {
      await api("POST", `/reservations/${r.id}/cancel`);
      onChange();
    } catch (e) {
      setError(errorText(e));
    }
  }

  const payLine = !r.payNow ? t("book.lineLater")
    : r.paid ? `${t("book.linePaid", { amount: r.paid.toFixed(2) })}${r.refunded ? ` · ${t("book.lineRefunded", { amount: r.refunded.toFixed(2) })}` : ""}`
    : r.status === "expired" && r.cancelReason === "not_paid" ? t("book.lineNotPaid")
    : r.status === "awaiting_restaurant" || r.status === "awaiting_payment" ? t("book.lineOnline", { amount: r.amountDue.toFixed(2) })
    : t("book.lineNothing");

  return (
    <View style={styles.card} testID={`reservation-${r.id}`}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{r.merchantName}</Text>
          <Text style={type.bodyMuted}>{prettyDate(r.date)} · {r.time} · {t("book.guests", { count: r.partySize })}</Text>
        </View>
        <Badge label={t(st.label)} tone={st.tone} />
      </View>
      {r.status === "awaiting_restaurant" && <Waiting deadline={r.respondBy} />}
      {r.status === "awaiting_payment" && <PayPanel r={r} onPaid={onChange} />}
      {r.allocatedTable && <Text style={type.body}>{t("book.table", { table: r.allocatedTable })}</Text>}
      {r.specialRequest ? <Text style={type.small}>{t("book.requestLine", { text: r.specialRequest })}</Text> : null}
      {r.preorder.length > 0 && (
        <View style={styles.pre}>
          <Text style={styles.preHead}>{t("book.preorderHead")}</Text>
          {r.preorder.map((p) => (
            <View key={p.id} style={styles.preRow}>
              <Text style={[type.body, { flex: 1 }]}>{p.qty}x {p.name}</Text>
              <Badge label={t(PRE_LABEL[p.status])} tone={PRE_TONE[p.status]} />
            </View>
          ))}
        </View>
      )}
      <Text style={type.small}>{payLine}</Text>
      {open && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <PrimaryButton label={t("book.modify")} variant="outline" style={{ flex: 1 }} disabled={!beforeCutoff} onPress={() => navigation.navigate("BookTable", { reservation: r })} />
          <PrimaryButton label={t("common.cancel")} variant="outline" style={{ flex: 1 }} disabled={!beforeCutoff} onPress={cancel} />
        </View>
      )}
      {open && !beforeCutoff && <Text style={type.small}>{t("book.cutoff", { min: Math.round(r.cutoffMs / 60000) })}</Text>}
      {open && <ChatButtons kind="reservation" id={r.id} allowCall />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export default function ReservationsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { merchants } = useCatalog();
  const { reservations, refresh, bookingsView, setBookingsView } = useLive();
  const [category, setCategory] = useState("Trending");
  const venues = merchants.filter((m) => m.venueCategory === category);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={type.h1}>{t("book.title")}</Text>
        <View style={styles.seg}>
          {(["book", "mine"] as const).map((v) => (
            <Pressable key={v} style={[styles.segBtn, bookingsView === v && styles.segOn]} onPress={() => setBookingsView(v)} testID={`seg-${v}`}>
              <Text style={[styles.segText, bookingsView === v && { color: colors.white }]}>{v === "book" ? t("book.venues") : `${t("book.myBookings")}${reservations.length ? ` (${reservations.length})` : ""}`}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {bookingsView === "book" ? (
        <FlatList
          data={venues}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <FlatList
              horizontal
              data={VENUE_CATEGORIES}
              keyExtractor={(c) => c}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}
              renderItem={({ item }) => (
                <Pressable onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipOn]} testID={`venue-cat-${item}`}>
                  <Text style={[styles.chipText, category === item && { color: colors.white }]}>{venueName(item)}</Text>
                </Pressable>
              )}
            />
          }
          ListEmptyComponent={<EmptyState icon="restaurant-outline" title={t("book.noVenues")} hint={t("home.tryAnother")} />}
          renderItem={({ item }) => (
            <Pressable style={styles.venue} onPress={() => navigation.navigate("BookTable", { merchantId: item.id })} testID={`venue-${item.id}`}>
              <View style={[styles.venueDot, { backgroundColor: item.color }]}><Ionicons name="restaurant" size={22} color={colors.white} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.h3}>{item.name}</Text>
                <Text style={type.bodyMuted}>{item.stallNo} · {item.distanceKm} km</Text>
                <Text style={type.small}>{item.openNow ? t("book.openNow") : t("book.closedNow")} · {item.hours.open}-{item.hours.close} · ★ {item.rating}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.stone} />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState icon="calendar-outline" title={t("book.noBookings")} hint={t("book.noBookingsHint")} />
          }
          renderItem={({ item }) => <ReservationCard r={item} onChange={refresh} navigation={navigation} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.md },
  seg: { flexDirection: "row", backgroundColor: colors.paperDim, borderRadius: radius.pill, padding: 3 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  venue: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  venueDot: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  pre: { backgroundColor: colors.paperDim, borderRadius: radius.sm, padding: spacing.sm, gap: 6 },
  preHead: { fontFamily: fonts.displayBold, fontSize: 11, color: colors.turmericDeep, textTransform: "uppercase" },
  preRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  error: { color: colors.chili, fontFamily: fonts.display },
  payBox: { backgroundColor: colors.amberTint, borderRadius: radius.md, borderWidth: 1, borderColor: colors.amberBorder, padding: spacing.md, gap: spacing.sm },
  input: { backgroundColor: colors.paper, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, fontFamily: fonts.serif, color: colors.text, borderWidth: 1, borderColor: colors.border },
});
