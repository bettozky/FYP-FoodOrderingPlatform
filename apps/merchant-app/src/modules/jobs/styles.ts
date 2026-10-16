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
    backgroundColor: colors?.primary || "#ea580c",
    borderRadius: radius?.md || 8,
    paddingVertical: spacing?.md || 14,
    alignItems: "center",
    cursor: "pointer" as any,
  },
  postBtnText: {
    color: colors?.white || "#ffffff",
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
    backgroundColor: colors?.surface || "#ffffff",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    cursor: "pointer" as any,
  },
  tabBtnActive: {
    backgroundColor: colors?.primary || "#ea580c",
    borderColor: colors?.primary || "#ea580c",
  },
  tabText: {
    fontSize: 13,
    color: colors?.text || "#1e293b",
    fontFamily: fonts?.display,
  },
  tabTextActive: {
    color: colors?.white || "#ffffff",
    fontWeight: "700",
  },

  /* --- 2. Job Vacancy Card --- */
  card: {
    backgroundColor: colors?.surface || "#ffffff",
    borderRadius: radius?.md || 10,
    padding: spacing?.md || 16,
    marginBottom: spacing?.md || 16,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    gap: 12,
  },
  cardClosed: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
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
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  salaryText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
  },
  typeBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "600",
  },
  applicantBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  applicantText: {
    color: "#b45309",
    fontSize: 11,
    fontWeight: "700",
  },

  /* --- 4. Description & Welfare Notes --- */
  descriptionText: {
    fontSize: 13,
    color: colors?.text || "#334155",
    lineHeight: 18,
  },
  perksBox: {
    backgroundColor: colors?.bg || "#f8fafc",
    padding: 10,
    borderRadius: radius?.sm || 6,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    gap: 4,
  },
  perksTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors?.textMuted || "#64748b",
    textTransform: "uppercase",
  },
  perksContent: {
    fontSize: 12,
    color: colors?.text || "#1e293b",
  },

  /* --- 5. Action Bar --- */
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors?.border || "#e2e8f0",
    paddingTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius?.sm || 6,
    cursor: "pointer" as any,
  },
  editBtn: {
    backgroundColor: colors?.bg || "#f8fafc",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
  },
  editBtnText: {
    fontSize: 12,
    color: colors?.text || "#1e293b",
    fontFamily: fonts?.display,
  },
  toggleStatusBtn: {
    borderWidth: 1,
  },
  closeBtn: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  closeBtnText: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "600",
  },
  reopenBtn: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  reopenBtnText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteBtnText: {
    fontSize: 12,
    color: "#dc2626",
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
    backgroundColor: colors?.surface || "#ffffff",
    borderRadius: radius?.lg || 12,
    padding: spacing?.xl || 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors?.text || "#0f172a",
    marginBottom: 4,
    marginTop: spacing?.sm || 10,
  },
  input: {
    backgroundColor: colors?.bg || "#f8fafc",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: radius?.sm || 6,
    paddingHorizontal: spacing?.md || 12,
    paddingVertical: spacing?.sm || 8,
    fontSize: 14,
    color: colors?.text || "#0f172a",
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
    backgroundColor: colors?.bg || "#f1f5f9",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    cursor: "pointer" as any,
  },
  quickChipActive: {
    backgroundColor: colors?.primary || "#ea580c",
    borderColor: colors?.primary || "#ea580c",
  },
  quickChipText: {
    fontSize: 12,
    color: colors?.text || "#1e293b",
  },
  quickChipTextActive: {
    color: colors?.white || "#ffffff",
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
    backgroundColor: colors?.bg || "#f8fafc",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
  },
  cancelBtnText: {
    color: colors?.text || "#475569",
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors?.primary || "#ea580c",
  },
  saveBtnText: {
    color: colors?.white || "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  btnHover: {
    transform: [{ translateY: -2 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
});
