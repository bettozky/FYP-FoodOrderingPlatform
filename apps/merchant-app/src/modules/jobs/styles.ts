import { StyleSheet } from "react-native";
import { colors, radius, spacing, fonts } from "../../shared/theme/theme";

export const merchantJobStyles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing?.lg || 24,
    paddingBottom: spacing?.xxl || 48,
  },
  headerSection: {
    gap: spacing?.md || 16,
    marginBottom: spacing?.md || 16,
  },

  /* --- 1. Top Action Button & Tabs --- */
  postBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius?.md || 8,
    paddingVertical: spacing?.md || 14,
    alignItems: "center",
    cursor: "pointer" as any,
  },
  postBtnText: {
    color: colors?.white || colors.white,
    fontFamily: fonts?.displayBold || fonts?.display,
    fontSize: 14,
    fontWeight: "700",
  },
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
    cursor: "pointer" as any,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors?.text || colors.ink,
    fontFamily: fonts?.display,
  },
  tabTextActive: {
    color: colors?.white || colors.white,
    fontWeight: "700",
  },

  /* --- 2. Job Vacancy Card --- */
  card: {
    backgroundColor: colors?.surface || colors.white,
    borderRadius: radius?.md || 10,
    padding: spacing?.md || 16,
    marginBottom: spacing?.md || 16,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    gap: 12,
  },
  cardClosed: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    opacity: 0.82,
  },
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
  salaryBadge: {
    backgroundColor: colors.herbLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  salaryText: {
    color: colors.herb,
    fontSize: 12,
    fontWeight: "700",
  },
  typeBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    color: colors.stoneText,
    fontSize: 11,
    fontWeight: "600",
  },
  applicantBadge: {
    backgroundColor: colors.amberTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  applicantText: {
    color: colors.amberText,
    fontSize: 11,
    fontWeight: "700",
  },

  /* --- 4. Description & Welfare Notes --- */
  descriptionText: {
    fontSize: 13,
    color: colors?.text || colors.ink,
    lineHeight: 18,
  },
  perksBox: {
    backgroundColor: colors?.bg || colors.bg,
    padding: 10,
    borderRadius: radius?.sm || 6,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    gap: 4,
  },
  perksTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors?.textMuted || colors.stoneText,
    textTransform: "uppercase",
  },
  perksContent: {
    fontSize: 12,
    color: colors?.text || colors.ink,
  },

  /* --- 5. Action Bar --- */
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors?.border || colors.border,
    paddingTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  toggleStatusBtn: {
    borderWidth: 1,
  },
  closeBtn: {
    backgroundColor: colors.amberTint,
    borderColor: colors.amberBorder,
  },
  closeBtnText: {
    color: colors.amberText,
    fontSize: 12,
    fontWeight: "600",
  },
  reopenBtn: {
    backgroundColor: colors.herbLight,
    borderColor: colors.herbBorder,
  },
  reopenBtnText: {
    color: colors.herb,
    fontSize: 12,
    fontWeight: "600",
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

  /* --- 6. Post / Edit Modal Styles --- */
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
    maxWidth: 500,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors?.text || colors.ink,
    marginBottom: 4,
    marginTop: spacing?.sm || 10,
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
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  quickChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius?.pill || 9999,
    backgroundColor: colors?.bg || colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors?.border || colors.border,
    cursor: "pointer" as any,
  },
  quickChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickChipText: {
    fontSize: 12,
    color: colors?.text || colors.ink,
  },
  quickChipTextActive: {
    color: colors?.white || colors.white,
    fontWeight: "700",
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
  btnHover: {
    transform: [{ translateY: -2 }],
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
});
