import { StyleSheet } from "react-native";
import { colors, radius, spacing, fonts } from "../../shared/theme/theme";

/* SECTION: MerchantMenuScreen */
export const merchantMenuStyles = StyleSheet.create({
  /* --- 1. Screen & Header --- */
  list: {
    paddingHorizontal: spacing?.lg || 24,
    paddingBottom: spacing?.xxl || 48,
  },
  headerSection: {
    gap: spacing?.md || 16,
    marginBottom: spacing?.md || 16,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius?.md || 8,
    paddingVertical: spacing?.md || 14,
    alignItems: "center",
    cursor: "pointer" as any,
  },
  addBtnText: {
    color: colors?.white || colors.white,
    fontFamily: fonts?.displayBold || fonts?.display,
    fontSize: 14,
    fontWeight: "700",
  },

  /* --- 2. Dynamic Category Filter Bar --- */
  categoryRow: {
    flexDirection: "row",
    gap: spacing?.sm || 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: spacing?.md || 16,
    paddingVertical: spacing?.sm || 8,
    borderRadius: radius?.pill || 9999,
    backgroundColor: colors?.surface || colors.white,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    cursor: "pointer" as any,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 13,
    color: colors?.text || colors.ink,
    fontFamily: fonts?.display,
  },
  categoryTextActive: {
    color: colors?.white || colors.white,
    fontWeight: "700",
  },

  /* --- 3. Dish Card Layout --- */
  card: {
    backgroundColor: colors?.surface || colors.white,
    borderRadius: radius?.md || 10,
    padding: spacing?.md || 16,
    marginBottom: spacing?.md || 16,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    gap: spacing?.sm || 10,
  },
  cardSoldOut: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    opacity: 0.85,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing?.md || 16,
  },
  emoji: {
    fontSize: 32,
  },
  textMuted: {
    color: colors?.textMuted || colors.stoneText,
    textDecorationLine: "line-through",
  },

  /* --- 4. Pricing, Cost & Profit Badges --- */
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  costLabel: {
    fontSize: 12,
    color: colors?.textMuted || colors.stoneText,
  },
  profitLabel: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  profitPos: {
    backgroundColor: colors.herbLight,
    color: colors.herb,
  },
  profitNeg: {
    backgroundColor: colors.chiliSoft,
    color: colors.chiliText,
  },
  qtyBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "600",
  },
  qtyActive: {
    backgroundColor: colors.herbLight,
    color: colors.herb,
  },
  qtyZero: {
    backgroundColor: colors.chiliSoft,
    color: colors.chiliText,
  },
  toggleCol: {
    alignItems: "center",
    gap: 4,
  },

  /* --- 5. Action Buttons (Edit & Delete) --- */
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing?.sm || 8,
    borderTopWidth: 1,
    borderTopColor: colors?.border || colors.border,
    paddingTop: spacing?.xs || 8,
  },
  actionBtn: {
    paddingHorizontal: spacing?.sm || 12,
    paddingVertical: 4,
    borderRadius: radius?.sm || 6,
    cursor: "pointer" as any,
  },
  editBtn: {
    backgroundColor: colors?.bg || colors.bg,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
  },
  editBtnText: {
    fontSize: 12,
    color: colors?.text || colors.ink,
    fontFamily: fonts?.display,
  },
  deleteBtn: {
    backgroundColor: colors.chiliSoft,
    borderWidth: 1,
    borderColor: colors.chiliBorder,
  },
  deleteBtnText: {
    fontSize: 12,
    color: colors.chiliText,
    fontFamily: fonts?.display,
    fontWeight: "600",
  },

  /* --- 6. Add / Edit Dish Modal Styles --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing?.lg || 16,
  },
  modalCard: {
    backgroundColor: colors?.surface || colors.white,
    borderRadius: radius?.lg || 12,
    padding: spacing?.xl || 24,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
  },
  modalSubtitle: {
    marginBottom: spacing?.md || 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors?.text || colors.ink,
    marginBottom: 4,
    marginTop: spacing?.xs || 8,
  },
  input: {
    backgroundColor: colors?.bg || colors.bg,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    borderRadius: radius?.sm || 6,
    paddingHorizontal: spacing?.md || 12,
    paddingVertical: spacing?.sm || 8,
    fontSize: 14,
    color: colors?.text || colors.ink,
  },
  quickCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing?.xs || 6,
  },
  quickCatChip: {
    paddingHorizontal: spacing?.sm || 10,
    paddingVertical: 4,
    borderRadius: radius?.pill || 9999,
    backgroundColor: colors?.bg || colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    cursor: "pointer" as any,
  },
  quickCatChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickCatText: {
    fontSize: 12,
    color: colors?.text || colors.ink,
  },
  quickCatTextActive: {
    color: colors?.white || colors.white,
    fontWeight: "700",
  },
  previewBox: {
    backgroundColor: colors.bg,
    padding: spacing?.sm || 10,
    borderRadius: radius?.sm || 6,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    marginTop: spacing?.xs || 6,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: spacing?.sm || 10,
    marginTop: spacing?.lg || 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing?.md || 12,
    alignItems: "center",
    borderRadius: radius?.md || 8,
    cursor: "pointer" as any,
  },
  cancelBtn: {
    backgroundColor: colors?.bg || colors.bg,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
  },
  cancelBtnText: {
    color: colors?.text || colors.stoneText,
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: colors?.white || colors.white,
    fontWeight: "700",
    fontSize: 14,
  },

  /* --- 7. Mouse Hover Feedback --- */
  btnHover: {
    transform: [{ translateY: -2 }],
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
});
