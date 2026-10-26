import React, { useState } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import { api, errorText } from "../../../shared/api/client";
import { Reservation } from "../../../shared/api/types";
import { RESTAURANT_TABLES } from "../../../shared/tables";
import { confirmAsync } from "../../../shared/util/confirm";
import { mmss, prettyDate, useCountdown } from "../../../shared/util/format";
import { colors, type } from "../../../shared/theme/theme";
import { merchantReservationStyles as s } from "../styles";
import ChatButtons from "../../chat/ChatButton";
import { useLive } from "../../orders/LiveDataContext";

function Remaining({ deadline }: { deadline: number }) {
  const secs = useCountdown(deadline);
  return (
    <View style={s.timerBadge}>
      <Text style={s.timerText}><Ionicons name="timer-outline" size={13} /> {mmss(secs)} to accept</Text>
    </View>
  );
}

export default function MerchantReservationsScreen() {
  const { reservations, refresh } = useLive();
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed" | "all">("pending");
  const [error, setError] = useState("");

  // Modal state
  const [selectedRsv, setSelectedRsv] = useState<Reservation | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  const pendingCount = reservations.filter((r) => r.status === "awaiting_restaurant").length;
  const holdsTable = (st: Reservation["status"]) => st === "confirmed" || st === "awaiting_payment"; // a table is held while the customer still has to pay
  const confirmedCount = reservations.filter((r) => holdsTable(r.status)).length;
  const filteredReservations = reservations.filter((r) => {
    if (activeTab === "pending") return r.status === "awaiting_restaurant";
    if (activeTab === "confirmed") return holdsTable(r.status);
    return true;
  });

  // Tables already given to another confirmed booking at the same date and time.
  const occupied = (r: Reservation | null) =>
    new Set(reservations.filter((x) => r && x.id !== r.id && holdsTable(x.status) && x.date === r.date && x.time === r.time && x.allocatedTable).map((x) => x.allocatedTable));

  async function call(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(errorText(e));
      await refresh();
    }
  }

  const handleOpenAssignTable = (rsv: Reservation) => {
    setSelectedRsv(rsv);
    setIsTableModalOpen(true);
  };

  // Accept (pending) or move (confirmed) to a table
  const handleConfirmReservation = (tableId: string) => {
    if (!selectedRsv) return;
    const r = selectedRsv;
    setIsTableModalOpen(false);
    if (r.status === "awaiting_restaurant") call(() => api("POST", `/merchant/reservations/${r.id}/respond`, { accept: true, table: tableId }));
    else call(() => api("POST", `/merchant/reservations/${r.id}/table`, { table: tableId }));
  };

  const handleDecline = async (r: Reservation) => {
    if (r.status === "awaiting_restaurant") return call(() => api("POST", `/merchant/reservations/${r.id}/respond`, { accept: false }));
    const ok = await confirmAsync("Cancel this booking?", `${r.customerName} will be notified${r.paid ? " and refunded" : ""}.`, "Cancel booking");
    if (ok) call(() => api("POST", `/merchant/reservations/${r.id}/cancel`));
  };

  // FR-5.10: approve or decline each pre-ordered dish separately (a declined dish does not cancel the table)
  const handlePreOrderItem = (r: Reservation, itemId: string, approve: boolean) =>
    call(() => api("POST", `/merchant/reservations/${r.id}/preorder/${itemId}`, { approve }));

  const busyTables = occupied(selectedRsv);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Table Reservations" subtitle={`${pendingCount} pending requests · ${confirmedCount} confirmed`} />

      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.container}
        ListHeaderComponent={
          <>
            {/* 1. SEATING OVERVIEW (tables given to confirmed bookings) */}
            <View style={s.floorOverviewCard}>
              <View style={s.rowBetween}>
                <Text style={[type.body, { fontWeight: "700" }]}>Dine-In Seating Plan</Text>
                <Text style={type.small}>
                  {RESTAURANT_TABLES.length - new Set(reservations.filter((r) => holdsTable(r.status) && r.allocatedTable).map((r) => r.allocatedTable)).size} tables not yet booked
                </Text>
              </View>
              <View style={s.floorGrid}>
                {RESTAURANT_TABLES.map((t) => {
                  const booked = reservations.filter((r) => holdsTable(r.status) && r.allocatedTable === t.id);
                  const isOccupied = booked.length > 0;
                  return (
                    <View key={t.id} style={[s.tablePill, isOccupied ? s.tableOccupied : s.tableAvailable]}>
                      <Text style={[s.tablePillTitle, { color: isOccupied ? colors.amberText : colors.herb }]}>{t.id}</Text>
                      <Text style={s.tablePillSub}>{isOccupied ? `Booked ${booked[0].time}` : `${t.capacity} Pax`}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 2. FILTER TABS */}
            <View style={s.tabRow}>
              {(["pending", "confirmed", "all"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable key={tab} style={[s.tabBtn, isActive && s.tabBtnActive]} onPress={() => setActiveTab(tab)} testID={`rtab-${tab}`}>
                    <Text style={[s.tabText, isActive && s.tabTextActive]}>
                      {tab === "pending" ? "Pending Requests" : tab === "confirmed" ? "Confirmed Dine-In" : "All Bookings"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No bookings here" hint="New table requests pop up automatically." />}
        renderItem={({ item }) => {
          const isPending = item.status === "awaiting_restaurant";
          const isConfirmed = item.status === "confirmed";
          const isUnpaid = item.status === "awaiting_payment";
          return (
            <View style={[s.card, isPending && s.cardPending]} testID={`mres-${item.id}`}>
              <View style={s.rowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[type.h3, { color: colors.text }]}>{item.id}</Text>
                  <View style={s.paxBadge}>
                    <Text style={s.paxText}>{item.partySize} Guests (Pax)</Text>
                  </View>
                </View>
                {isPending ? (
                  <Remaining deadline={item.respondBy} />
                ) : (
                  <Badge
                    label={isUnpaid ? "WAITING FOR PAYMENT" : item.status.toUpperCase()}
                    tone={isConfirmed ? "success" : item.status === "completed" ? "neutral" : "warning"}
                  />
                )}
              </View>

              <View style={s.rowBetween}>
                <Text style={[type.body, { fontWeight: "700" }]}><Ionicons name="calendar-outline" size={14} /> {prettyDate(item.date)} at {item.time}</Text>
                {item.allocatedTable ? (
                  <Text style={{ fontSize: 13, color: colors.herb, fontWeight: "700" }}><Ionicons name="location-outline" size={14} /> Allocated: {item.allocatedTable}</Text>
                ) : isPending ? (
                  <Text style={{ fontSize: 12, color: colors.amberText, fontWeight: "600" }}><Ionicons name="alert-circle-outline" size={13} /> Table not yet assigned</Text>
                ) : null}
              </View>

              {/* Customer contact & call (FR-5.9) */}
              <View style={s.customerRow}>
                <View>
                  <Text style={[type.body, { fontWeight: "700" }]}>{item.customerName}</Text>
                  <Text style={type.small}>{item.customerPhone}</Text>
                </View>
              </View>
              {(item.status === "awaiting_restaurant" || item.status === "awaiting_payment" || item.status === "confirmed") && <ChatButtons kind="reservation" id={item.id} allowCall />}

              {item.specialRequest ? (
                <Text style={[type.small, { fontStyle: "italic", color: colors.textMuted }]}>Note: "{item.specialRequest}"</Text>
              ) : null}
              <Text style={type.small}>{!item.payNow ? "Pay later at the restaurant" : item.paid ? `Paid RM ${item.paid.toFixed(2)}${item.refunded ? ` (refunded RM ${item.refunded.toFixed(2)})` : ""}` : isUnpaid ? `Waiting for the customer to pay RM ${(item.amountDue ?? 0).toFixed(2)}. The table is held until the payment window ends.` : `Customer pays online (RM ${(item.amountDue ?? 0).toFixed(2)}) after you confirm`}</Text>

              {/* Pre-order: approve / decline each dish separately (FR-5.10) */}
              {item.preorder.length > 0 && (
                <View style={s.preOrderBox}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>Pre-ordered food (approve or decline each dish separately):</Text>
                  {item.preorder.map((dish) => (
                    <View key={dish.id} style={s.preOrderItemRow}>
                      <Text style={[type.body, { flex: 1 }]}>{dish.qty}x {dish.name}</Text>
                      {dish.status === "pending" && (item.status === "awaiting_restaurant" || item.status === "awaiting_payment" || item.status === "confirmed") ? (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <Pressable style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: colors.herbLight }} onPress={() => handlePreOrderItem(item, dish.id, true)} testID={`pre-ok-${dish.id}`}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.herb }}>Accept</Text>
                          </Pressable>
                          <Pressable style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: colors.chiliSoft }} onPress={() => handlePreOrderItem(item, dish.id, false)} testID={`pre-no-${dish.id}`}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.chiliText }}>Decline</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: dish.status === "approved" ? colors.herbLight : dish.status === "declined" ? colors.chiliSoft : colors.paperDim }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: dish.status === "approved" ? colors.herb : dish.status === "declined" ? colors.chiliText : colors.stone }}>
                            {dish.status === "approved" ? "Food Accepted" : dish.status === "declined" ? "Kitchen Declined" : "Pending"}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={s.actionRow}>
                {isPending ? (
                  <>
                    <Pressable style={s.confirmBtn} onPress={() => handleOpenAssignTable(item)} testID={`assign-${item.id}`}>
                      <Text style={s.confirmBtnText}>Assign Table & Accept</Text>
                    </Pressable>
                    <Pressable style={s.declineBtn} onPress={() => handleDecline(item)} testID={`decline-${item.id}`}>
                      <Text style={s.declineBtnText}>Decline</Text>
                    </Pressable>
                  </>
                ) : isConfirmed ? (
                  <>
                    <Pressable style={[s.rescheduleBtn, { flex: 1 }]} onPress={() => handleOpenAssignTable(item)}>
                      <Text style={s.rescheduleBtnText}>Reassign Table</Text>
                    </Pressable>
                    <Pressable style={[s.declineBtn, { flex: 1 }]} onPress={() => handleDecline(item)}>
                      <Text style={s.declineBtnText}>Cancel</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {/* ================= MODAL: ASSIGN TABLE ================= */}
      <Modal visible={isTableModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={type.h2}>Assign Dine-In Table</Text>
            <Text style={type.bodyMuted}>Select a table for {selectedRsv?.customerName} ({selectedRsv?.partySize} Pax):</Text>
            <ScrollView style={{ maxHeight: 240 }}>
              <View style={{ gap: 8 }}>
                {RESTAURANT_TABLES.map((table) => {
                  const unavailable = busyTables.has(table.id) || (selectedRsv ? table.capacity < selectedRsv.partySize : false);
                  return (
                    <Pressable
                      key={table.id}
                      disabled={unavailable}
                      style={{
                        flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 8, borderWidth: 1,
                        borderColor: unavailable ? colors.stoneLine : colors.primary, backgroundColor: unavailable ? colors.paperDim : colors.white, opacity: unavailable ? 0.6 : 1,
                      }}
                      onPress={() => handleConfirmReservation(table.id)}
                      testID={`pick-${table.id}`}
                    >
                      <Text style={[type.body, { fontWeight: "700" }]}>{table.name}</Text>
                      <Text style={{ fontSize: 12, color: unavailable ? colors.chiliText : colors.herb }}>
                        {busyTables.has(table.id) ? "Taken" : unavailable ? "Too small" : "Select & Confirm"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable style={[s.rescheduleBtn, { marginTop: 8 }]} onPress={() => setIsTableModalOpen(false)}>
              <Text style={s.rescheduleBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
