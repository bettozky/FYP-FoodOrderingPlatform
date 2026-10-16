import { StyleSheet } from "react-native";
import { colors, radius, spacing, fonts } from "../../shared/theme/theme";

export const merchantReservationStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing?.lg || 24,
    paddingBottom: spacing?.xxl || 48,
    gap: spacing?.md || 16,
  },

  /* --- 1. Table Floor Status Bar --- */
  floorOverviewCard: {
    backgroundColor: colors?.surface || "#ffffff",
    borderRadius: radius?.md || 10,
    padding: spacing?.md || 16,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    gap: 10,
  },
  floorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tablePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius?.sm || 6,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 80,
  },
  tableAvailable: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  tableOccupied: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  tablePillTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  tablePillSub: {
    fontSize: 10,
    color: colors?.textMuted || "#64748b",
  },

  /* --- 2. Filter Tabs --- */
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius?.pill || 9999,
    backgroundColor: colors?.surface || "#ffffff",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
  },
  tabBtnActive: {
    backgroundColor: colors?.primary || "#ea580c",
    borderColor: colors?.primary || "#ea580c",
  },
  tabText: {
    fontSize: 13,
    color: colors?.text || "#1e293b",
  },
  tabTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  /* --- 3. Reservation Card --- */
  card: {
    backgroundColor: colors?.surface || "#ffffff",
    borderRadius: radius?.md || 10,
    padding: spacing?.md || 16,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    gap: 12,
  },
  cardPending: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffdfa",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  timerBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  timerText: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "700",
  },
  paxBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  paxText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "700",
  },

  /* --- 4. Customer & Liaison Section --- */
  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors?.bg || "#f8fafc",
    padding: 10,
    borderRadius: radius?.sm || 6,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
  },
  callBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius?.pill || 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  callBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  /* --- 5. Pre-Order Dishes Box --- */
  preOrderBox: {
    backgroundColor: "#f8fafc",
    borderRadius: radius?.sm || 6,
    padding: 10,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    gap: 6,
  },
  preOrderItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* --- 6. Table Allocation Dropdown Indicator --- */
  tableAllocatedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },

  /* --- 7. Action Button Rows --- */
  actionRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors?.border || "#e2e8f0",
    paddingTop: 12,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors?.primary || "#ea580c",
    paddingVertical: 10,
    borderRadius: radius?.md || 8,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  rescheduleBtn: {
    flex: 1.5,
    backgroundColor: colors?.bg || "#f8fafc",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    paddingVertical: 10,
    borderRadius: radius?.md || 8,
    alignItems: "center",
  },
  rescheduleBtnText: {
    color: colors?.text || "#1e293b",
    fontSize: 13,
    fontWeight: "600",
  },
  declineBtn: {
    flex: 1,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingVertical: 10,
    borderRadius: radius?.md || 8,
    alignItems: "center",
  },
  declineBtnText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "700",
  },

  /* --- 8. Modals (Assign Table / Reschedule) --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors?.surface || "#ffffff",
    borderRadius: radius?.lg || 12,
    padding: 24,
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    gap: 14,
  },
  input: {
    backgroundColor: colors?.bg || "#f8fafc",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: radius?.sm || 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors?.text || "#0f172a",
  },
});
