import React, { useState } from "react";
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
import ScreenHeader from "../../components/ScreenHeader";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type, fonts } from "../../theme/theme";

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

const initialVouchers: Voucher[] = [
  {
    id: "VCH-001",
    code: "WELCOME5",
    type: "fixed",
    discountValue: 5,
    minSpend: 25,
    totalLimit: 100,
    claimedCount: 68,
    costSpent: 340, // 68 * RM 5
    expiryDate: "2026-10-31",
    isActive: true,
  },
  {
    id: "VCH-002",
    code: "LUNCH15",
    type: "percentage",
    discountValue: 15,
    minSpend: 30,
    totalLimit: 50,
    claimedCount: 45,
    costSpent: 225.5,
    expiryDate: "2026-10-15",
    isActive: true,
  },
  {
    id: "VCH-003",
    code: "FLASH10",
    type: "fixed",
    discountValue: 10,
    minSpend: 50,
    totalLimit: 30,
    claimedCount: 30,
    costSpent: 300,
    expiryDate: "2026-09-25",
    isActive: false, // Expired or fully claimed
  },
];

export default function MerchantVouchersScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [totalLimit, setTotalLimit] = useState("");
  const [expiryDate, setExpiryDate] = useState("2026-10-31");

  // Summary calculation metrics
  const totalCostSpent = vouchers.reduce((acc, curr) => acc + curr.costSpent, 0);
  const totalVouchersRemaining = vouchers.reduce(
    (acc, curr) => acc + (curr.totalLimit - curr.claimedCount),
    0
  );

  const toggleVoucherStatus = (id: string) => {
    setVouchers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isActive: !v.isActive } : v))
    );
  };

  const handleCreateVoucher = () => {
    if (!code || !discountValue || !minSpend || !totalLimit) return;

    const newVoucher: Voucher = {
      id: `VCH-00${vouchers.length + 1}`,
      code: code.toUpperCase().trim(),
      type: discountType,
      discountValue: parseFloat(discountValue) || 0,
      minSpend: parseFloat(minSpend) || 0,
      totalLimit: parseInt(totalLimit, 10) || 1,
      claimedCount: 0,
      costSpent: 0,
      expiryDate,
      isActive: true,
    };

    setVouchers([newVoucher, ...vouchers]);
    setIsModalOpen(false);
    // Reset form
    setCode("");
    setDiscountValue("");
    setMinSpend("");
    setTotalLimit("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title="Promotions & Vouchers"
        subtitle={`${vouchers.filter((v) => v.isActive).length} active campaigns`}
      />

      <FlatList
        data={vouchers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* ================= 1. BUDGET & COST OVERVIEW ================= */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>RM {totalCostSpent.toFixed(2)}</Text>
                <Text style={type.small}>Total Cost Spent</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalVouchersRemaining}</Text>
                <Text style={type.small}>Vouchers Remaining</Text>
              </View>
            </View>

            {/* ================= 2. CREATE VOUCHER BUTTON ================= */}
            <Pressable
              style={({ hovered }: any) => [styles.createBtn, hovered && styles.btnHover]}
              onPress={() => setIsModalOpen(true)}
            >
              <Text style={styles.createBtnText}>+ Create New Voucher</Text>
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
                        ? `${item.discountValue}% OFF`
                        : `RM ${item.discountValue.toFixed(2)} OFF`
                    }
                    tone="primary"
                  />
                </View>

                <Badge
                  label={!item.isActive ? "Paused" : isSoldOut ? "Fully Claimed" : "Active"}
                  tone={!item.isActive ? "neutral" : isSoldOut ? "warning" : "success"}
                />
              </View>

              {/* Rules & Conditions */}
              <View style={styles.rulesWrap}>
                <Text style={type.bodyMuted}>
                  Min. Spend:{" "}
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    RM {item.minSpend.toFixed(2)}
                  </Text>{" "}
                  · Valid until:{" "}
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {item.expiryDate}
                  </Text>
                </Text>
              </View>

              {/* Vouchers Still Have & Cost Spent */}
              <View style={styles.metricsBox}>
                <View style={styles.metricItem}>
                  <Text style={type.small}>Stock Remaining</Text>
                  <Text style={[type.body, { fontWeight: "700" }]}>
                    {remaining} / {item.totalLimit} left
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={type.small}>Cost Spent by Store</Text>
                  <Text style={[type.body, { fontWeight: "700", color: colors.primary }]}>
                    RM {item.costSpent.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Action Button: Pause / Resume */}
              <View style={[styles.rowBetween, { marginTop: 4 }]}>
                <Text style={type.bodyMuted}>
                  {item.claimedCount} customers redeemed
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
                      { color: item.isActive ? "#991b1b" : "#065f46" },
                    ]}
                  >
                    {item.isActive ? "Pause Campaign" : "Resume Campaign"}
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
              <Text style={type.h2}>Create Discount Voucher</Text>
              <Text style={[type.bodyMuted, { marginBottom: spacing.md }]}>
                Set discount rules, limits, and redemption quota.
              </Text>

              {/* Voucher Code */}
              <Text style={styles.inputLabel}>Voucher Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SUPERSAVER10"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />

              {/* Discount Limit Type Toggle */}
              <Text style={styles.inputLabel}>Discount Limit Type</Text>
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
                    Percentage (%)
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
                    Fixed Amount (RM)
                  </Text>
                </Pressable>
              </View>

              {/* Discount Value */}
              <Text style={styles.inputLabel}>
                {discountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (RM)"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={discountType === "percentage" ? "e.g. 15" : "e.g. 5.00"}
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
              />

              {/* Minimum Spend */}
              <Text style={styles.inputLabel}>Minimum Spend Required (RM)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 30.00"
                keyboardType="numeric"
                value={minSpend}
                onChangeText={setMinSpend}
              />

              {/* Quantity Limit (Vouchers Still Have) */}
              <Text style={styles.inputLabel}>Total Voucher Stock / Limit</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 100"
                keyboardType="numeric"
                value={totalLimit}
                onChangeText={setTotalLimit}
              />

              {/* Expiry Date */}
              <Text style={styles.inputLabel}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-10-31"
                value={expiryDate}
                onChangeText={setExpiryDate}
              />

              {/* Modal Action Buttons */}
              <View style={[styles.rowBetween, { marginTop: spacing.lg, gap: spacing.sm }]}>
                <Pressable
                  style={[styles.cancelBtn, { flex: 1 }]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.submitBtn, { flex: 1 }]}
                  onPress={handleCreateVoucher}
                >
                  <Text style={styles.submitBtnText}>Create Voucher</Text>
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
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  toggleResume: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});
