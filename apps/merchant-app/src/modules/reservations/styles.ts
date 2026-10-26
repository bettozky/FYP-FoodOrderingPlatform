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
    backgroundColor: colors?.surface || colors.white,
    borderRadius: radius?.md || 10,
    padding: spacing?.md || 16,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
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
    backgroundColor: colors.herbLight,
    borderColor: colors.herbBorder,
  },
  tableOccupied: {
    backgroundColor: colors.amberTint,
    borderColor: colors.amberBorder,
  },
  tablePillTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  tablePillSub: {
    fontSize: 10,
    color: colors?.textMuted || colors.stoneText,
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
    backgroundColor: colors?.surface || colors.white,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors?.text || colors.ink,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: "700",
  },

  /* --- 3. Reservation Card --- */
  card: {
    backgroundColor: colors?.surface || colors.white,
    borderRadius: radius?.md || 10,
    padding: spacing?.md || 16,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    gap: 12,
  },
  cardPending: {
    borderColor: colors.turmericDeep,
    backgroundColor: colors.amberTint,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  timerBadge: {
    backgroundColor: colors.chiliSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  timerText: {
    color: colors.chiliText,
    fontSize: 11,
    fontWeight: "700",
  },
  paxBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  paxText: {
    color: colors.stoneText,
    fontSize: 12,
    fontWeight: "700",
  },

  /* --- 4. Customer & Liaison Section --- */
  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors?.bg || colors.bg,
    padding: 10,
    borderRadius: radius?.sm || 6,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
  },
  callBtn: {
    backgroundColor: colors.herb,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius?.pill || 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  callBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },

  /* --- 5. Pre-Order Dishes Box --- */
  preOrderBox: {
    backgroundColor: colors.bg,
    borderRadius: radius?.sm || 6,
    padding: 10,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
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
    borderTopColor: colors?.border || colors.border,
    paddingTop: 12,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius?.md || 8,
    alignItems: "center",
  },
  confirmBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  rescheduleBtn: {
    flex: 1.5,
    backgroundColor: colors?.bg || colors.bg,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    paddingVertical: 10,
    borderRadius: radius?.md || 8,
    alignItems: "center",
  },
  rescheduleBtnText: {
    color: colors?.text || colors.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  declineBtn: {
    flex: 1,
    backgroundColor: colors.chiliSoft,
    borderWidth: 1,
    borderColor: colors.chiliBorder,
    paddingVertical: 10,
    borderRadius: radius?.md || 8,
    alignItems: "center",
  },
  declineBtnText: {
    color: colors.chiliText,
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
    backgroundColor: colors?.surface || colors.white,
    borderRadius: radius?.lg || 12,
    padding: 24,
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    gap: 14,
  },
  input: {
    backgroundColor: colors?.bg || colors.bg,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    borderRadius: radius?.sm || 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors?.text || colors.ink,
  },
});
