import React, { useEffect, useState } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { api, errorText } from "../../../shared/api/client";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";
import { useTranslation } from "react-i18next";

export interface Voucher {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  discountValue: number;
  minSpend: number;
  totalLimit: number;
  claimedCount: number;
  costSpent: number; // Total cost spent by restaurant for this voucher
  expiryDate: string;
  isActive: boolean;
}

// Map the backend voucher to this screen's shape.
const fromApi = (v: any): Voucher => ({
  id: v.id,
  code: v.title,
  type: v.kind === "percent" ? "percentage" : "fixed",
  discountValue: v.amount,
  minSpend: v.minSpend,
  totalLimit: v.totalLimit ?? 0,
  claimedCount: v.claimed,
  costSpent: v.costSpent,
  expiryDate: v.expiryDate ?? "", // "" = no expiry
  isActive: v.active,
});


/** One month from today, as YYYY-MM-DD, so the form never starts with a date in the past. */
function defaultExpiry(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MerchantVouchersScreen() {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [message, setMessage] = useState("");
  const load = () =>
    api<{ vouchers: any[] }>("GET", "/merchant/vouchers").then((r) => setVouchers(r.vouchers.map(fromApi))).catch((e) => setMessage(errorText(e)));
  useEffect(() => {
    load();
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [totalLimit, setTotalLimit] = useState("");
  const [expiryDate, setExpiryDate] = useState(defaultExpiry());

  // Summary calculation metrics
  const totalCostSpent = vouchers.reduce((acc, curr) => acc + curr.costSpent, 0);
  const totalVouchersRemaining = vouchers.reduce(
    (acc, curr) => acc + (curr.totalLimit - curr.claimedCount),
    0
  );

  const toggleVoucherStatus = (id: string) => {
    const v = vouchers.find((x) => x.id === id);
    if (!v) return;
    api("PATCH", `/merchant/vouchers/${id}`, { active: !v.isActive }).then(load).catch((e) => setMessage(errorText(e)));
  };

  const handleCreateVoucher = async () => {
    if (!code || !discountValue || !minSpend || !totalLimit) return;
    try {
      await api("POST", "/merchant/vouchers", {
        title: code.trim(),
        kind: discountType === "percentage" ? "percent" : "fixed",
        amount: parseFloat(discountValue) || 0,
        minSpend: parseFloat(minSpend) || 0,
        totalLimit: parseInt(totalLimit, 10) || 1,
        expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ? expiryDate : undefined,
      });
      setIsModalOpen(false);
      setMessage("");
      setCode("");
      setDiscountValue("");
      setMinSpend("");
      setTotalLimit("");
      load();
    } catch (e) {
      setMessage(errorText(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={t("drawer.vouchers")}
        subtitle={t("vouchers.activeCount", { n: vouchers.filter((v) => v.isActive).length })}
      />
      {message ? <Text style={{ color: colors.danger, paddingHorizontal: spacing.lg }}>{message}</Text> : null}

      <FlatList
        data={vouchers}
        ListEmptyComponent={<EmptyState icon="pricetags-outline" title={t("vouchers.empty")} hint={t("vouchers.emptyHint")} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* ================= 1. BUDGET & COST OVERVIEW ================= */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>RM {totalCostSpent.toFixed(2)}</Text>
                <Text style={type.small}>{t("vouchers.totalCost")}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalVouchersRemaining}</Text>
                <Text style={type.small}>{t("vouchers.remaining")}</Text>
              </View>
            </View>

            {/* ================= 2. CREATE VOUCHER BUTTON ================= */}
            <Pressable
              style={({ hovered }: any) => [styles.createBtn, hovered && styles.btnHover]}
              onPress={() => setIsModalOpen(true)}
            >
              <Text style={styles.createBtnText}>+ {t("vouchers.createNew")}</Text>
            </Pressable>
          </>
        }
        renderItem={({ item }) => {
          const remaining = item.totalLimit - item.claimedCount;
          const isSoldOut = remaining <= 0;

          return (
            <View style={styles.card}>
              {/* Header: Code & Active Status */}
              <View style={styles.rowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={type.h3}>{item.code}</Text>
                  <Badge
                    label={
                      item.type === "percentage"
                        ? t("vouchers.pctOff", { n: item.discountValue })
                        : t("vouchers.rmOff", { amount: item.discountValue.toFixed(2) })
                    }
                    tone="primary"
                  />
                </View>

                <Badge
                  label={!item.isActive ? t("vouchers.paused") : isSoldOut ? t("vouchers.fullyClaimed") : t("orders.active")}
                  tone={!item.isActive ? "neutral" : isSoldOut ? "warning" : "success"}
                />
              </View>

              {/* Rules & Conditions */}
              <View style={styles.rulesWrap}>
                <Text style={type.bodyMuted}>
                  {t("vouchers.minSpend")}{" "}
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    RM {item.minSpend.toFixed(2)}
                  </Text>{" "}
                  · {t("vouchers.validUntil")}{" "}
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {item.expiryDate || t("vouchers.noExpiry")}
                  </Text>
                </Text>
              </View>

              {/* Vouchers Still Have & Cost Spent */}
              <View style={styles.metricsBox}>
                <View style={styles.metricItem}>
                  <Text style={type.small}>{t("vouchers.stockRemaining")}</Text>
                  <Text style={[type.body, { fontWeight: "700" }]}>
                    {t("vouchers.left", { n: remaining, total: item.totalLimit })}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={type.small}>{t("vouchers.costByStore")}</Text>
                  <Text style={[type.body, { fontWeight: "700", color: colors.primary }]}>
                    RM {item.costSpent.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Action Button: Pause / Resume */}
              <View style={[styles.rowBetween, { marginTop: 4 }]}>
                <Text style={type.bodyMuted}>
                  {t("vouchers.redeemed", { count: item.claimedCount })}
                </Text>
                <Pressable
                  style={({ hovered }: any) => [
                    styles.toggleBtn,
                    item.isActive ? styles.togglePause : styles.toggleResume,
                    hovered && styles.btnHover,
                  ]}
                  onPress={() => toggleVoucherStatus(item.id)}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      { color: item.isActive ? colors.chiliText : colors.herb },
                    ]}
                  >
                    {item.isActive ? t("vouchers.pause") : t("vouchers.resume")}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {/* ================= 3. CREATE VOUCHER MODAL ================= */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={type.h2}>{t("vouchers.createTitle")}</Text>
              <Text style={[type.bodyMuted, { marginBottom: spacing.md }]}>
                {t("vouchers.createIntro")}
              </Text>

              {/* Voucher Code */}
              <Text style={styles.inputLabel}>{t("vouchers.code")}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SUPERSAVER10"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />

              {/* Discount Limit Type Toggle */}
              <Text style={styles.inputLabel}>{t("vouchers.type")}</Text>
              <View style={styles.typeSelector}>
                <Pressable
                  style={[
                    styles.typeBtn,
                    discountType === "percentage" && styles.typeBtnActive,
                  ]}
                  onPress={() => setDiscountType("percentage")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      discountType === "percentage" && styles.typeBtnTextActive,
                    ]}
                  >
                    {t("vouchers.percentage")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeBtn,
                    discountType === "fixed" && styles.typeBtnActive,
                  ]}
                  onPress={() => setDiscountType("fixed")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      discountType === "fixed" && styles.typeBtnTextActive,
                    ]}
                  >
                    {t("vouchers.fixed")}
                  </Text>
                </Pressable>
              </View>

              {/* Discount Value */}
              <Text style={styles.inputLabel}>
                {discountType === "percentage" ? t("vouchers.pctLabel") : t("vouchers.amountLabel")}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("menu.eg", { v: discountType === "percentage" ? "15" : "5.00" })}
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
              />

              {/* Minimum Spend */}
              <Text style={styles.inputLabel}>{t("vouchers.minSpendLabel")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("menu.eg", { v: "30.00" })}
                keyboardType="numeric"
                value={minSpend}
                onChangeText={setMinSpend}
              />

              {/* Quantity Limit (Vouchers Still Have) */}
              <Text style={styles.inputLabel}>{t("vouchers.limit")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("menu.eg", { v: "100" })}
                keyboardType="numeric"
                value={totalLimit}
                onChangeText={setTotalLimit}
              />

              {/* Expiry Date */}
              <Text style={styles.inputLabel}>{t("vouchers.expiry")}</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={expiryDate}
                onChangeText={setExpiryDate}
              />

              {/* Modal Action Buttons */}
              <View style={[styles.rowBetween, { marginTop: spacing.lg, gap: spacing.sm }]}>
                <Pressable
                  style={[styles.cancelBtn, { flex: 1 }]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
                </Pressable>

                <Pressable
                  style={[styles.submitBtn, { flex: 1 }]}
                  onPress={handleCreateVoucher}
                >
                  <Text style={styles.submitBtnText}>{t("vouchers.create")}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  /* Stats summary */
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
    color: colors.text,
  },

  /* Create button */
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  createBtnText: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },

  /* Voucher Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rulesWrap: {
    marginTop: 2,
  },
  metricsBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 4,
  },
  metricItem: {
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  togglePause: {
    backgroundColor: colors.chiliSoft,
    borderColor: colors.chiliBorder,
  },
  toggleResume: {
    backgroundColor: colors.herbLight,
    borderColor: colors.herbBorder,
  },
  toggleBtnText: {
    fontSize: 12,
    fontFamily: fonts.displayBold,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  typeSelector: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnText: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.display,
  },
  typeBtnTextActive: {
    color: colors.white,
    fontFamily: fonts.displayBold,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  cancelBtnText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
  },
  submitBtnText: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },

  btnHover: {
    transform: [{ translateY: -2 }],
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});
