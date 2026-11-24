import { StyleSheet } from "react-native";
import { colors, layout, radius, spacing, font, ui } from "../../shared/theme/theme";

/* SECTION: MerchantMenuScreen */
export const merchantMenuStyles = StyleSheet.create({
  /* --- 1. Screen & Header --- */
  list: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xxl * 1.5, width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" },
  headerSection: { gap: spacing.lg, marginBottom: spacing.lg },
  addBtn: { ...ui.buttonDark, minHeight: 50, flexDirection: "row", gap: spacing.sm, cursor: "pointer" as any },
  addBtnText: { ...ui.buttonDarkText, fontSize: 16 },

  /* --- 2. Dynamic Category Filter Bar --- */
  categoryRow: { flexDirection: "row", gap: spacing.sm, paddingVertical: 2 },
  categoryChip: { ...ui.chip, cursor: "pointer" as any },
  categoryChipActive: { ...ui.chipOn },
  categoryText: { ...ui.chipText },
  categoryTextActive: { ...ui.chipTextOn, ...font.displayBold },

  /* --- 3. Dish Card Layout --- */
  card: { ...ui.card, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  cardSoldOut: { backgroundColor: colors.paperDim, borderColor: colors.stoneLine },
  mainRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  emoji: {
    fontSize: 32,
  },
  textMuted: { color: colors.stoneText, textDecorationLine: "line-through" },

  /* --- 4. Pricing, Cost & Profit Badges --- */
  pricingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  costLabel: { fontSize: 13, ...font.display, color: colors.stoneText, fontVariant: ["tabular-nums"] },
  profitLabel: { fontSize: 12, ...font.displayBold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: "hidden", fontVariant: ["tabular-nums"] },
  profitPos: {
    backgroundColor: colors.herbLight,
    color: colors.herb,
  },
  profitNeg: {
    backgroundColor: colors.chiliSoft,
    color: colors.chiliText,
  },
  qtyBadge: { fontSize: 12, ...font.displayBold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: "hidden" },
  qtyActive: {
    backgroundColor: colors.herbLight,
    color: colors.herb,
  },
  qtyZero: {
    backgroundColor: colors.chiliSoft,
    color: colors.chiliText,
  },
  toggleCol: { alignItems: "center", gap: 6 },

  /* --- 5. Action Buttons (Edit & Delete) --- */
  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft, paddingTop: spacing.md },
  actionBtn: { minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: "center", cursor: "pointer" as any },
  editBtn: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft },
  editBtnText: { fontSize: 14, ...font.displayBold, color: colors.ink },
  deleteBtn: { backgroundColor: colors.chiliSoft, borderWidth: 1, borderColor: colors.chiliBorder },
  deleteBtnText: { fontSize: 14, ...font.displayBold, color: colors.chiliText },

  /* --- 6. Add / Edit Dish Modal Styles --- */
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, width: "100%", maxWidth: 480, maxHeight: "90%" },
  modalSubtitle: { marginBottom: spacing.md },
  inputLabel: { fontSize: 14, ...font.displayBold, color: colors.ink, marginBottom: 6, marginTop: spacing.md },
  input: { ...ui.input },
  quickCategoryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xs, marginTop: spacing.xs },
  quickCatChip: { ...ui.chip, minHeight: 32, paddingVertical: 4, cursor: "pointer" as any },
  quickCatChipActive: { ...ui.chipOn },
  quickCatText: { ...ui.chipText, fontSize: 13 },
  quickCatTextActive: { ...ui.chipTextOn, ...font.displayBold },
  previewBox: { backgroundColor: colors.paperDim, padding: spacing.md, borderRadius: radius.sm, marginTop: spacing.sm },
  modalFooter: { paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft, marginTop: spacing.md },
  modalBtnRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  modalBtn: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, cursor: "pointer" as any },
  cancelBtn: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft },
  cancelBtnText: { color: colors.ink, ...font.displayBold, fontSize: 16 },
  saveBtn: { backgroundColor: colors.ink },
  saveBtnText: { color: colors.white, ...font.displayBold, fontSize: 16 },

  /* --- 7. Mouse Hover Feedback --- */
  btnHover: { opacity: 0.88 },
});
