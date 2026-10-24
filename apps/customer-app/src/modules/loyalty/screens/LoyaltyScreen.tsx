import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useLoyalty } from "../useLoyalty";
import { api } from "../../../shared/api/client";
import { Voucher } from "../../../shared/api/types";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";

export default function LoyaltyScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  useEffect(() => {
    api<{ vouchers: Voucher[] }>("GET", "/vouchers").then((r) => setVouchers(r.vouchers)).catch(() => {});
  }, []);
  const loyalty = useLoyalty();
  const progress = Math.min(1, loyalty.progress);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={type.h1}>Loyalty & vouchers</Text>
      </View>

      <FlatList
        data={vouchers}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>{loyalty.tier} member</Text>
            <Text style={styles.points}>{loyalty.points} pts</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressHint}>
              {loyalty.nextTier ? `${loyalty.toNext} pts to ${loyalty.nextTier}` : "Top tier reached"} · 1 pt for every RM 1 on completed orders
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.voucherCard}>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{item.title}</Text>
              <Text style={type.bodyMuted}>{item.description}</Text>
              <Text style={type.small}>{item.minSpend ? `Min spend RM ${item.minSpend}` : "No minimum spend"}</Text>
            </View>
            <View style={styles.redeemBtn}>
              <Text style={styles.redeemBtnText}>Apply at checkout</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  pointsCard: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  pointsLabel: { color: colors.herbLight, fontSize: 13, fontFamily: fonts.display },
  points: { color: colors.white, fontSize: 32, fontFamily: fonts.displayExtraBold, marginTop: 4 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressFill: { height: 8, backgroundColor: colors.white, borderRadius: 4 },
  progressHint: { color: colors.herbLight, fontSize: 12, marginTop: 6 },
  voucherCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  redeemBtn: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  redeemBtnDisabled: { backgroundColor: colors.surfaceAlt },
  redeemBtnText: { color: colors.primaryDark, fontFamily: fonts.displayBold, fontSize: 12 },
});
