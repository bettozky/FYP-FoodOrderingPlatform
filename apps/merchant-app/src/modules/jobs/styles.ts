import { StyleSheet } from "react-native";
import { colors, layout, radius, spacing, font, ui } from "../../shared/theme/theme";

export const merchantJobStyles = StyleSheet.create({
  list: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xxl * 1.5, width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" },
  headerSection: { gap: spacing.lg, marginBottom: spacing.lg },

  /* --- 1. Top Action Button & Tabs --- */
  postBtn: { ...ui.buttonDark, minHeight: 50, flexDirection: "row", gap: spacing.sm, cursor: "pointer" as any },
  postBtnText: { ...ui.buttonDarkText, fontSize: 16 },
  tabRow: { ...ui.segTrack },
  tabBtn: { ...ui.segItem, cursor: "pointer" as any },
  tabBtnActive: { ...ui.segItemOn },
  tabText: { ...ui.segText },
  tabTextActive: { ...ui.segTextOn },

  /* --- 2. Job Vacancy Card --- */
  card: { ...ui.card, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  cardClosed: { backgroundColor: colors.paperDim, borderColor: colors.stoneLine },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  /* --- 3. Badges (Salary, Type, Applicants) --- */
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  salaryBadge: { backgroundColor: colors.paperDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  salaryText: { color: colors.ink, fontSize: 13, ...font.displayBold, fontVariant: ["tabular-nums"] },
  typeBadge: { backgroundColor: colors.paperDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  typeText: { color: colors.stoneText, fontSize: 13, ...font.display },
  applicantBadge: { backgroundColor: colors.amberTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  applicantText: { color: colors.amberText, fontSize: 13, ...font.displayBold },

  /* --- 4. Description & Welfare Notes --- */
  descriptionText: { color: colors.ink, fontSize: 15, lineHeight: 21, ...font.serif },
  perksBox: { backgroundColor: colors.paperDim, padding: spacing.md, borderRadius: radius.sm, gap: 2 },
  perksTitle: { color: colors.stoneText, fontSize: 13, ...font.displayBold },
  perksContent: { color: colors.ink, fontSize: 14, lineHeight: 20, ...font.serif },

  /* --- 5. Action Bar --- */
  actionRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft, paddingTop: spacing.md, marginTop: spacing.xs },
  actionBtn: { minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: "center", cursor: "pointer" as any },
  editBtn: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft },
  editBtnText: { fontSize: 14, ...font.displayBold, color: colors.ink },
  toggleStatusBtn: {
    borderWidth: 1,
  },
  closeBtn: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft },
  closeBtnText: { fontSize: 14, ...font.displayBold, color: colors.ink },
  reopenBtn: { backgroundColor: colors.ink },
  reopenBtnText: { fontSize: 14, ...font.displayBold, color: colors.white },
  deleteBtn: { backgroundColor: colors.chiliSoft, borderWidth: 1, borderColor: colors.chiliBorder },
  deleteBtnText: { fontSize: 14, ...font.displayBold, color: colors.chiliText },

  /* --- 6. Post / Edit Modal Styles --- */
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, width: "100%", maxWidth: 480, maxHeight: "90%" },
  inputLabel: { fontSize: 14, ...font.displayBold, color: colors.ink, marginBottom: 6, marginTop: spacing.md },
  input: { ...ui.input },
  textArea: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  quickChipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  quickChip: { ...ui.chip, minHeight: 32, paddingVertical: 4, cursor: "pointer" as any },
  quickChipActive: { ...ui.chipOn },
  quickChipText: { ...ui.chipText, fontSize: 13 },
  quickChipTextActive: { ...ui.chipTextOn, ...font.displayBold },
  modalBtnRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  modalBtn: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, cursor: "pointer" as any },
  cancelBtn: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft },
  cancelBtnText: { color: colors.ink, ...font.displayBold, fontSize: 16 },
  saveBtn: { backgroundColor: colors.ink },
  saveBtnText: { color: colors.white, ...font.displayBold, fontSize: 16 },
  btnHover: { opacity: 0.88 },
});
