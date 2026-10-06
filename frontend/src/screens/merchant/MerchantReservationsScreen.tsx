import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Linking,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import ScreenHeader from "../../components/ScreenHeader";
import Badge from "../../components/Badge";
import { colors, type } from "../../theme/theme";
import { merchantReservationStyles as s } from "../../styles/Merchantstyles";

export interface ReservationPreOrder {
  dishId: string;
  name: string;
  qty: number;
  price: number;
  approved: boolean; // Pre-orders can be accepted/declined separately (FR-5.10)
}

export interface TableReservation {
  id: string;
  customerName: string;
  phone: string;
  pax: number;
  bookingDate: string;
  bookingTime: string;
  allocatedTable?: string;
  minutesRemaining: number; // 30-minute countdown (Section 3)
  status: "pending" | "confirmed" | "completed" | "cancelled";
  preOrders?: ReservationPreOrder[];
  specialRequest?: string;
}

// Available restaurant seating tables
const RESTAURANT_TABLES = [
  { id: "T-01", name: "Table 1 (2 Pax)", capacity: 2, isOccupied: false },
  { id: "T-02", name: "Table 2 (2 Pax)", capacity: 2, isOccupied: true },
  { id: "T-03", name: "Table 3 (4 Pax)", capacity: 4, isOccupied: false },
  { id: "T-04", name: "Table 4 (4 Pax)", capacity: 4, isOccupied: true },
  { id: "T-05", name: "Table 5 (6 Pax)", capacity: 6, isOccupied: false },
  { id: "VIP-A", name: "VIP Room A (8 Pax)", capacity: 8, isOccupied: false },
];

const mockReservations: TableReservation[] = [
  {
    id: "RSV-101",
    customerName: "Dr. Jason Wong",
    phone: "+60128889922",
    pax: 4,
    bookingDate: "Today",
    bookingTime: "7:30 PM",
    allocatedTable: undefined,
    minutesRemaining: 18,
    status: "pending",
    specialRequest: "Near window seat, celebrating birthday.",
    preOrders: [
      { dishId: "d1", name: "Sarawak Laksa Special", qty: 2, price: 12.0, approved: true },
      { dishId: "d2", name: "Teh C Peng Special", qty: 4, price: 4.5, approved: true },
    ],
  },
  {
    id: "RSV-102",
    customerName: "Nurul Aini",
    phone: "+60135552341",
    pax: 2,
    bookingDate: "Today",
    bookingTime: "8:00 PM",
    allocatedTable: "T-01",
    minutesRemaining: 0,
    status: "confirmed",
  },
  {
    id: "RSV-103",
    customerName: "Marcus Tan",
    phone: "+60172223399",
    pax: 6,
    bookingDate: "Tomorrow",
    bookingTime: "1:00 PM",
    allocatedTable: "T-05",
    minutesRemaining: 0,
    status: "confirmed",
  },
];

export default function MerchantReservationsScreen() {
  const [reservations, setReservations] = useState<TableReservation[]>(mockReservations);
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed" | "all">("pending");

  // Modal States
  const [selectedRsv, setSelectedRsv] = useState<TableReservation | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [newTime, setNewTime] = useState("");

  const filteredReservations = reservations.filter((r) => {
    if (activeTab === "pending") return r.status === "pending";
    if (activeTab === "confirmed") return r.status === "confirmed";
    return true;
  });

  // FR-5.9: Dial customer phone number
  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  // Open Table Allocation Modal
  const handleOpenAssignTable = (rsv: TableReservation) => {
    setSelectedRsv(rsv);
    setIsTableModalOpen(true);
  };

  // Confirm booking & Assign Table
  const handleConfirmReservation = (tableId: string) => {
    if (!selectedRsv) return;
    setReservations((prev) =>
      prev.map((r) =>
        r.id === selectedRsv.id
          ? { ...r, status: "confirmed", allocatedTable: tableId }
          : r
      )
    );
    setIsTableModalOpen(false);
  };

  // Decline or Cancel Reservation
  const handleDecline = (id: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r))
    );
  };

  // FR-5.10: Toggle individual pre-order item approval
  const handleTogglePreOrderItem = (rsvId: string, dishId: string) => {
    setReservations((prev) =>
      prev.map((r) => {
        if (r.id !== rsvId || !r.preOrders) return r;
        return {
          ...r,
          preOrders: r.preOrders.map((item) =>
            item.dishId === dishId ? { ...item, approved: !item.approved } : item
          ),
        };
      })
    );
  };

  // Reschedule Booking
  const handleSaveReschedule = () => {
    if (!selectedRsv || !newTime.trim()) return;
    setReservations((prev) =>
      prev.map((r) =>
        r.id === selectedRsv.id ? { ...r, bookingTime: newTime.trim() } : r
      )
    );
    setIsRescheduleModalOpen(false);
    setNewTime("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title="Table Reservations"
        subtitle={`${reservations.filter((r) => r.status === "pending").length} pending requests · ${reservations.filter((r) => r.status === "confirmed").length} confirmed`}
      />

      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.container}
        ListHeaderComponent={
          <>
            {/* 1. SEATING ALLOCATION FLOOR OVERVIEW */}
            <View style={s.floorOverviewCard}>
              <View style={s.rowBetween}>
                <Text style={[type.body, { fontWeight: "700" }]}>Dine-In Seating Status</Text>
                <Text style={type.small}>
                  {RESTAURANT_TABLES.filter((t) => !t.isOccupied).length} Tables Available
                </Text>
              </View>

              <View style={s.floorGrid}>
                {RESTAURANT_TABLES.map((t) => (
                  <View
                    key={t.id}
                    style={[
                      s.tablePill,
                      t.isOccupied ? s.tableOccupied : s.tableAvailable,
                    ]}
                  >
                    <Text
                      style={[
                        s.tablePillTitle,
                        { color: t.isOccupied ? "#b45309" : "#065f46" },
                      ]}
                    >
                      {t.id}
                    </Text>
                    <Text style={s.tablePillSub}>
                      {t.isOccupied ? "Occupied" : `${t.capacity} Pax`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 2. FILTER TABS */}
            <View style={s.tabRow}>
              {(["pending", "confirmed", "all"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    style={[s.tabBtn, isActive && s.tabBtnActive]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[s.tabText, isActive && s.tabTextActive]}>
                      {tab === "pending"
                        ? "Pending Requests"
                        : tab === "confirmed"
                        ? "Confirmed Dine-In"
                        : "All Bookings"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        }
        renderItem={({ item }) => {
          const isPending = item.status === "pending";

          return (
            <View style={[s.card, isPending && s.cardPending]}>
              {/* Header: ID, Pax, Time & Countdown */}
              <View style={s.rowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[type.h3, { color: colors.text }]}>{item.id}</Text>
                  <View style={s.paxBadge}>
                    <Text style={s.paxText}>{item.pax} Guests (Pax)</Text>
                  </View>
                </View>

                {isPending && item.minutesRemaining > 0 ? (
                  <View style={s.timerBadge}>
                    <Text style={s.timerText}>⏱️ {item.minutesRemaining}m to accept</Text>
                  </View>
                ) : (
                  <Badge
                    label={item.status.toUpperCase()}
                    tone={
                      item.status === "confirmed"
                        ? "success"
                        : item.status === "cancelled"
                        ? "warning"
                        : "neutral"
                    }
                  />
                )}
              </View>

              {/* Date & Allocated Table Info */}
              <View style={s.rowBetween}>
                <Text style={[type.body, { fontWeight: "700" }]}>
                  📅 {item.bookingDate} at {item.bookingTime}
                </Text>

                {item.allocatedTable ? (
                  <Text style={{ fontSize: 13, color: "#059669", fontWeight: "700" }}>
                    📍 Allocated: {item.allocatedTable}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, color: "#d97706", fontWeight: "600" }}>
                    ⚠️ Table Not Yet Assigned
                  </Text>
                )}
              </View>

              {/* Customer Contact & Call Liaison (FR-5.9) */}
              <View style={s.customerRow}>
                <View>
                  <Text style={[type.body, { fontWeight: "700" }]}>{item.customerName}</Text>
                  <Text style={type.small}>{item.phone}</Text>
                </View>

                <Pressable
                  style={s.callBtn}
                  onPress={() => handleCallCustomer(item.phone)}
                >
                  <Text style={s.callBtnText}>📞 Call Customer</Text>
                </Pressable>
              </View>

              {/* Special Requests */}
              {item.specialRequest && (
                <Text style={[type.small, { fontStyle: "italic", color: colors.textMuted }]}>
                  Note: "{item.specialRequest}"
                </Text>
              )}

              {/* Pre-Order Dish Breakdown with Separate Toggle (FR-5.10) */}
              {item.preOrders && item.preOrders.length > 0 && (
                <View style={s.preOrderBox}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>
                    Pre-Ordered Food (Can approve/decline dishes separately):
                  </Text>
                  {item.preOrders.map((dish) => (
                    <View key={dish.dishId} style={s.preOrderItemRow}>
                      <Text style={[type.body, { flex: 1 }]}>
                        {dish.qty}x {dish.name}
                      </Text>
                      <Pressable
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 4,
                          backgroundColor: dish.approved ? "#dcfce7" : "#fee2e2",
                        }}
                        onPress={() => handleTogglePreOrderItem(item.id, dish.dishId)}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: dish.approved ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {dish.approved ? "Food Accepted" : "Kitchen Declined"}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={s.actionRow}>
                {isPending ? (
                  <>
                    <Pressable
                      style={s.confirmBtn}
                      onPress={() => handleOpenAssignTable(item)}
                    >
                      <Text style={s.confirmBtnText}>Assign Table & Accept</Text>
                    </Pressable>

                    <Pressable
                      style={s.rescheduleBtn}
                      onPress={() => {
                        setSelectedRsv(item);
                        setIsRescheduleModalOpen(true);
                      }}
                    >
                      <Text style={s.rescheduleBtnText}>Reschedule</Text>
                    </Pressable>

                    <Pressable
                      style={s.declineBtn}
                      onPress={() => handleDecline(item.id)}
                    >
                      <Text style={s.declineBtnText}>Decline</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={[s.rescheduleBtn, { flex: 1 }]}
                      onPress={() => {
                        setSelectedRsv(item);
                        setIsRescheduleModalOpen(true);
                      }}
                    >
                      <Text style={s.rescheduleBtnText}>Change Time</Text>
                    </Pressable>

                    <Pressable
                      style={[s.rescheduleBtn, { flex: 1 }]}
                      onPress={() => handleOpenAssignTable(item)}
                    >
                      <Text style={s.rescheduleBtnText}>Reassign Table</Text>
                    </Pressable>

                    <Pressable
                      style={[s.declineBtn, { flex: 1 }]}
                      onPress={() => handleDecline(item.id)}
                    >
                      <Text style={s.declineBtnText}>Cancel</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* ================= MODAL 1: ASSIGN TABLE SEAT ================= */}
      <Modal visible={isTableModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={type.h2}>Assign Dine-In Table</Text>
            <Text style={type.bodyMuted}>
              Select a table for {selectedRsv?.customerName} ({selectedRsv?.pax} Pax):
            </Text>

            <ScrollView style={{ maxHeight: 240 }}>
              <View style={{ gap: 8 }}>
                {RESTAURANT_TABLES.map((table) => (
                  <Pressable
                    key={table.id}
                    disabled={table.isOccupied}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: table.isOccupied ? "#e2e8f0" : colors.primary,
                      backgroundColor: table.isOccupied ? "#f8fafc" : "#fff",
                      opacity: table.isOccupied ? 0.6 : 1,
                    }}
                    onPress={() => handleConfirmReservation(table.id)}
                  >
                    <Text style={[type.body, { fontWeight: "700" }]}>{table.name}</Text>
                    <Text style={{ fontSize: 12, color: table.isOccupied ? "#dc2626" : "#059669" }}>
                      {table.isOccupied ? "Occupied" : "Select & Confirm"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable
              style={[s.rescheduleBtn, { marginTop: 8 }]}
              onPress={() => setIsTableModalOpen(false)}
            >
              <Text style={s.rescheduleBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 2: RESCHEDULE TIME ================= */}
      <Modal visible={isRescheduleModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={type.h2}>Reschedule Booking Time</Text>
            <Text style={type.bodyMuted}>
              Enter a proposed time for {selectedRsv?.customerName}:
            </Text>

            <TextInput
              style={s.input}
              placeholder="e.g. 8:30 PM"
              value={newTime}
              onChangeText={setNewTime}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                style={[s.rescheduleBtn, { flex: 1 }]}
                onPress={() => setIsRescheduleModalOpen(false)}
              >
                <Text style={s.rescheduleBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[s.confirmBtn, { flex: 1 }]}
                onPress={handleSaveReschedule}
              >
                <Text style={s.confirmBtnText}>Save Time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


