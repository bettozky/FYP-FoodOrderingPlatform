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
import i18n from "../../../shared/i18n";
import { useTranslation } from "react-i18next";

function Remaining({ deadline }: { deadline: number }) {
  const secs = useCountdown(deadline);
  return (
    <View style={s.timerBadge}>
      <Text style={s.timerText}><Ionicons name="timer-outline" size={13} /> {i18n.t("resv.toAccept", { time: mmss(secs) })}</Text>
    </View>
  );
}

export default function MerchantReservationsScreen() {
  const { reservations, refresh } = useLive();
  const { t } = useTranslation();
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
    const ok = await confirmAsync(t("resv.cancelTitle"), r.paid ? t("resv.cancelBodyRefund", { name: r.customerName }) : t("resv.cancelBody", { name: r.customerName }), t("resv.cancelOk"));
    if (ok) call(() => api("POST", `/merchant/reservations/${r.id}/cancel`));
  };

  // FR-5.10: approve or decline each pre-ordered dish separately (a declined dish does not cancel the table)
  const handlePreOrderItem = (r: Reservation, itemId: string, approve: boolean) =>
    call(() => api("POST", `/merchant/reservations/${r.id}/preorder/${itemId}`, { approve }));

  const busyTables = occupied(selectedRsv);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("drawer.reservations")} subtitle={t("resv.subtitle", { pending: pendingCount, confirmed: confirmedCount })} />

      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.container}
        ListHeaderComponent={
          <>
            {/* 1. SEATING OVERVIEW (tables given to confirmed bookings) */}
            <View style={s.floorOverviewCard}>
              <View style={s.rowBetween}>
                <Text style={[type.body, { fontWeight: "700" }]}>{t("resv.seatingPlan")}</Text>
                <Text style={type.small}>
                  {t("resv.freeTables", { n: RESTAURANT_TABLES.length - new Set(reservations.filter((r) => holdsTable(r.status) && r.allocatedTable).map((r) => r.allocatedTable)).size })}
                </Text>
              </View>
              <View style={s.floorGrid}>
                {RESTAURANT_TABLES.map((t) => {
                  const booked = reservations.filter((r) => holdsTable(r.status) && r.allocatedTable === t.id);
                  const isOccupied = booked.length > 0;
                  return (
                    <View key={t.id} style={[s.tablePill, isOccupied ? s.tableOccupied : s.tableAvailable]}>
                      <Text style={[s.tablePillTitle, { color: isOccupied ? colors.amberText : colors.herb }]}>{t.id}</Text>
                      <Text style={s.tablePillSub}>{isOccupied ? i18n.t("resv.booked", { time: booked[0].time }) : i18n.t("resv.pax", { n: t.capacity })}</Text>
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
                      {tab === "pending" ? t("resv.tabPending") : tab === "confirmed" ? t("resv.tabConfirmed") : t("resv.tabAll")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={<EmptyState icon="calendar-outline" title={t("resv.empty")} hint={t("resv.emptyHint")} />}
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
                    <Text style={s.paxText}>{t("resv.guests", { n: item.partySize })}</Text>
                  </View>
                </View>
                {isPending ? (
                  <Remaining deadline={item.respondBy} />
                ) : (
                  <Badge
                    label={t(`resv.st_${item.status}`)}
                    tone={isConfirmed ? "success" : item.status === "completed" ? "neutral" : "warning"}
                  />
                )}
              </View>

              <View style={s.rowBetween}>
                <Text style={[type.body, { fontWeight: "700" }]}><Ionicons name="calendar-outline" size={14} /> {t("resv.dateAt", { date: prettyDate(item.date), time: item.time })}</Text>
                {item.allocatedTable ? (
                  <Text style={{ fontSize: 13, color: colors.herb, fontWeight: "700" }}><Ionicons name="location-outline" size={14} /> {t("resv.allocated", { table: item.allocatedTable })}</Text>
                ) : isPending ? (
                  <Text style={{ fontSize: 12, color: colors.amberText, fontWeight: "600" }}><Ionicons name="alert-circle-outline" size={13} /> {t("resv.notAssigned")}</Text>
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
                <Text style={[type.small, { fontStyle: "italic", color: colors.textMuted }]}>{t("resv.note", { text: item.specialRequest })}</Text>
              ) : null}
              <Text style={type.small}>{!item.payNow ? t("resv.payLater") : item.paid ? `${t("popup.paid", { amount: item.paid.toFixed(2) })}${item.refunded ? ` ${t("resv.refunded", { amount: item.refunded.toFixed(2) })}` : ""}` : isUnpaid ? t("resv.waitPay", { amount: (item.amountDue ?? 0).toFixed(2) }) : t("resv.payOnline", { amount: (item.amountDue ?? 0).toFixed(2) })}</Text>

              {/* Pre-order: approve / decline each dish separately (FR-5.10) */}
              {item.preorder.length > 0 && (
                <View style={s.preOrderBox}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>{t("resv.preordered")}</Text>
                  {item.preorder.map((dish) => (
                    <View key={dish.id} style={s.preOrderItemRow}>
                      <Text style={[type.body, { flex: 1 }]}>{dish.qty}x {dish.name}</Text>
                      {dish.status === "pending" && (item.status === "awaiting_restaurant" || item.status === "awaiting_payment" || item.status === "confirmed") ? (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <Pressable style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: colors.herbLight }} onPress={() => handlePreOrderItem(item, dish.id, true)} testID={`pre-ok-${dish.id}`}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.herb }}>{t("resv.accept")}</Text>
                          </Pressable>
                          <Pressable style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: colors.chiliSoft }} onPress={() => handlePreOrderItem(item, dish.id, false)} testID={`pre-no-${dish.id}`}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.chiliText }}>{t("resv.decline")}</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: dish.status === "approved" ? colors.herbLight : dish.status === "declined" ? colors.chiliSoft : colors.paperDim }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: dish.status === "approved" ? colors.herb : dish.status === "declined" ? colors.chiliText : colors.stone }}>
                            {dish.status === "approved" ? t("resv.foodAccepted") : dish.status === "declined" ? t("resv.kitchenDeclined") : t("resv.pending")}
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
                      <Text style={s.confirmBtnText}>{t("resv.assignAccept")}</Text>
                    </Pressable>
                    <Pressable style={s.declineBtn} onPress={() => handleDecline(item)} testID={`decline-${item.id}`}>
                      <Text style={s.declineBtnText}>{t("resv.decline")}</Text>
                    </Pressable>
                  </>
                ) : isConfirmed ? (
                  <>
                    <Pressable style={[s.rescheduleBtn, { flex: 1 }]} onPress={() => handleOpenAssignTable(item)}>
                      <Text style={s.rescheduleBtnText}>{t("resv.reassign")}</Text>
                    </Pressable>
                    <Pressable style={[s.declineBtn, { flex: 1 }]} onPress={() => handleDecline(item)}>
                      <Text style={s.declineBtnText}>{t("common.cancel")}</Text>
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
            <Text style={type.h2}>{t("resv.assignTitle")}</Text>
            <Text style={type.bodyMuted}>{t("resv.selectFor", { name: selectedRsv?.customerName ?? "", n: selectedRsv?.partySize ?? 0 })}</Text>
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
                        {busyTables.has(table.id) ? t("resv.taken") : unavailable ? t("resv.tooSmall") : t("resv.select")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable style={[s.rescheduleBtn, { marginTop: 8 }]} onPress={() => setIsTableModalOpen(false)}>
              <Text style={s.rescheduleBtnText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
