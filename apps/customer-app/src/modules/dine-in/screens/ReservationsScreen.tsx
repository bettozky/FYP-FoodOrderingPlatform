import React, { useState } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Badge from "../../../shared/components/Badge";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { api, errorText } from "../../../shared/api/client";
import { Reservation } from "../../../shared/api/types";
import { mmss, prettyDate, useCountdown } from "../../../shared/util/format";
import { confirmAsync } from "../../../shared/util/confirm";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { useCatalog } from "../../discovery/CatalogContext";
import { useLive } from "../../ordering/LiveDataContext";

export const VENUE_CATEGORIES = ["Trending", "Buffet", "Luxury", "Aesthetic Cafe"];

const STATUS: Record<Reservation["status"], { label: string; tone: "primary" | "success" | "warning" | "danger" | "neutral" }> = {
  awaiting_restaurant: { label: "Awaiting restaurant", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired - no reply", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  completed: { label: "Completed", tone: "neutral" },
};
const PRE_TONE = { pending: "warning", approved: "success", declined: "danger" } as const;

function Waiting({ deadline }: { deadline: number }) {
  const s = useCountdown(deadline);
  return <Text style={type.small}>The restaurant has {mmss(s)} left to reply.</Text>;
}

function ReservationCard({ r, onChange, navigation }: { r: Reservation; onChange: () => void; navigation: any }) {
  const [error, setError] = useState("");
  const slot = new Date(`${r.date}T${r.time}:00+08:00`).getTime();
  const open = r.status === "awaiting_restaurant" || r.status === "confirmed";
  const beforeCutoff = slot - Date.now() >= r.cutoffMs;
  const st = STATUS[r.status];

  async function cancel() {
    const ok = await confirmAsync("Cancel reservation?", `Cancel your table at ${r.merchantName}?${r.paid ? " Your payment will be refunded." : ""}`, "Cancel booking");
    if (!ok) return;
    try {
      await api("POST", `/reservations/${r.id}/cancel`);
      onChange();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <View style={styles.card} testID={`reservation-${r.id}`}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{r.merchantName}</Text>
          <Text style={type.bodyMuted}>{prettyDate(r.date)} · {r.time} · {r.partySize} {r.partySize === 1 ? "guest" : "guests"}</Text>
        </View>
        <Badge label={st.label} tone={st.tone} />
      </View>
      {r.status === "awaiting_restaurant" && <Waiting deadline={r.respondBy} />}
      {r.allocatedTable && <Text style={type.body}>Table: {r.allocatedTable}</Text>}
      {r.specialRequest ? <Text style={type.small}>Request: {r.specialRequest}</Text> : null}
      {r.preorder.length > 0 && (
        <View style={styles.pre}>
          <Text style={styles.preHead}>Pre-order</Text>
          {r.preorder.map((p) => (
            <View key={p.id} style={styles.preRow}>
              <Text style={[type.body, { flex: 1 }]}>{p.qty}x {p.name}</Text>
              <Badge label={p.status === "pending" ? "Pending" : p.status === "approved" ? "Approved" : "Declined"} tone={PRE_TONE[p.status]} />
            </View>
          ))}
        </View>
      )}
      <Text style={type.small}>
        {r.payNow ? `Paid RM ${r.paid.toFixed(2)}${r.refunded ? ` · refunded RM ${r.refunded.toFixed(2)}` : ""}` : "Pay later (at the restaurant)"}
      </Text>
      {open && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <PrimaryButton label="Modify" variant="outline" style={{ flex: 1 }} disabled={!beforeCutoff} onPress={() => navigation.navigate("BookTable", { reservation: r })} />
          <PrimaryButton label="Cancel" variant="outline" style={{ flex: 1 }} disabled={!beforeCutoff} onPress={cancel} />
        </View>
      )}
      {open && !beforeCutoff && <Text style={type.small}>Changes and cancellations close {Math.round(r.cutoffMs / 60000)} minutes before your slot.</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export default function ReservationsScreen({ navigation }: any) {
  const { merchants } = useCatalog();
  const { reservations, refresh, bookingsView, setBookingsView } = useLive();
  const [category, setCategory] = useState("Trending");
  const venues = merchants.filter((m) => m.venueCategory === category);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={type.h1}>Book a table</Text>
        <View style={styles.seg}>
          {(["book", "mine"] as const).map((v) => (
            <Pressable key={v} style={[styles.segBtn, bookingsView === v && styles.segOn]} onPress={() => setBookingsView(v)} testID={`seg-${v}`}>
              <Text style={[styles.segText, bookingsView === v && { color: colors.white }]}>{v === "book" ? "Venues" : `My bookings${reservations.length ? ` (${reservations.length})` : ""}`}</Text>
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
                  <Text style={[styles.chipText, category === item && { color: colors.white }]}>{item}</Text>
                </Pressable>
              )}
            />
          }
          ListEmptyComponent={<EmptyState icon="restaurant-outline" title="No venues here yet" hint="Try another category." />}
          renderItem={({ item }) => (
            <Pressable style={styles.venue} onPress={() => navigation.navigate("BookTable", { merchantId: item.id })} testID={`venue-${item.id}`}>
              <View style={[styles.venueDot, { backgroundColor: item.color }]}><Text style={{ fontSize: 22 }}>🍽️</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.h3}>{item.name}</Text>
                <Text style={type.bodyMuted}>{item.stallNo} · {item.distanceKm} km</Text>
                <Text style={type.small}>{item.openNow ? "Open now" : "Closed now"} · {item.hours.open}-{item.hours.close} · ★ {item.rating}</Text>
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
            <EmptyState icon="calendar-outline" title="No bookings yet" hint="Pick a venue to reserve a table." />
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
});
