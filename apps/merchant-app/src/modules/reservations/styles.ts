import { StyleSheet } from "react-native";
import { colors, layout, radius, spacing, font, ui } from "../../shared/theme/theme";

export const merchantReservationStyles = StyleSheet.create({
  container: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xxl * 1.5, gap: spacing.md, width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" },

  /* --- 1. Table Floor Status Bar --- */
  floorOverviewCard: { ...ui.card, padding: spacing.lg, gap: spacing.md },
  floorGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tablePill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", minWidth: 76 },
  tableAvailable: {
    backgroundColor: colors.herbLight,
    borderColor: colors.herbBorder,
  },
  tableOccupied: {
    backgroundColor: colors.amberTint,
    borderColor: colors.amberBorder,
  },
  tablePillTitle: { fontSize: 14, ...font.displayBold },
  tablePillSub: { fontSize: 12, ...font.display, color: colors.stoneText },

  /* --- 2. Filter Tabs --- */
  tabRow: { ...ui.segTrack, marginBottom: spacing.md },
  tabBtn: { ...ui.segItem },
  tabBtnActive: { ...ui.segItemOn },
  tabText: { ...ui.segText },
  tabTextActive: { ...ui.segTextOn },

  /* --- 3. Reservation Card --- */
  card: { ...ui.card, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  cardPending: { borderColor: colors.amberBorder, backgroundColor: colors.amberTint },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  timerBadge: { backgroundColor: colors.chiliSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  timerText: { color: colors.chiliText, fontSize: 13, ...font.displayBold, fontVariant: ["tabular-nums"] },
  paxBadge: { backgroundColor: colors.paperDim, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  paxText: { color: colors.stoneText, fontSize: 13, ...font.displayBold },

  /* --- 4. Customer & Liaison Section --- */
  customerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, backgroundColor: colors.paperDim, borderRadius: radius.sm, padding: spacing.md },
  callBtn: { backgroundColor: colors.ink, borderRadius: radius.pill, minHeight: 36, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: 6 },
  callBtnText: { color: colors.white, fontSize: 14, ...font.displayBold },

  /* --- 5. Pre-Order Dishes Box --- */
  preOrderBox: { backgroundColor: colors.paperDim, borderRadius: radius.sm, padding: spacing.md, gap: 6 },
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
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft, paddingTop: spacing.md, marginTop: spacing.xs },
  confirmBtn: { flex: 1, minHeight: 44, backgroundColor: colors.ink, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  confirmBtnText: { color: colors.white, fontSize: 15, ...font.displayBold },
  rescheduleBtn: { flex: 1, minHeight: 44, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  rescheduleBtnText: { color: colors.ink, fontSize: 15, ...font.displayBold },
  declineBtn: { flex: 1, minHeight: 44, backgroundColor: colors.chiliSoft, borderWidth: 1, borderColor: colors.chiliBorder, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  declineBtnText: { color: colors.chiliText, fontSize: 15, ...font.displayBold },

  /* --- 8. Modals (Assign Table / Reschedule) --- */
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, width: "100%", maxWidth: 480, maxHeight: "90%" },
  input: { ...ui.input },
});
