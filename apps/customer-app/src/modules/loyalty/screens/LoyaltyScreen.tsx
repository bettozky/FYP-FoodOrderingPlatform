import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useLoyalty } from "../useLoyalty";
import { api } from "../../../shared/api/client";
import { Voucher } from "../../../shared/api/types";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "../../../shared/components/EmptyState";
import { colors, font, layout, radius, spacing, type } from "../../../shared/theme/theme";

export default function LoyaltyScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  useEffect(() => {
    // Vouchers this customer has already used go to the bottom, faded and marked "Used".
    api<{ vouchers: Voucher[] }>("GET", "/vouchers")
      .then((r) => setVouchers([...r.vouchers.filter((v) => !v.used), ...r.vouchers.filter((v) => v.used)]))
      .catch(() => {});
  }, []);
  const loyalty = useLoyalty();
  const progress = Math.min(1, loyalty.progress);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Loyalty & vouchers" />

      <FlatList
        data={vouchers}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
          <View style={styles.pointsCard} accessible accessibilityLabel={`${loyalty.tier} member, ${loyalty.points} points`}>
            <Text style={styles.pointsLabel}>{loyalty.tier} member</Text>
            <Text style={styles.points}>{loyalty.points.toLocaleString()} <Text style={styles.pointsUnit}>pts</Text></Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressHint}>
              {loyalty.nextTier ? `${loyalty.toNext} pts to ${loyalty.nextTier}` : "Top tier reached"}
            </Text>
            <Text style={styles.progressNote}>1 point for every RM 1 on completed orders</Text>
          </View>
          <Text style={styles.section} accessibilityRole="header">Vouchers</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="pricetags-outline" title="No vouchers right now" hint="Stalls add offers from time to time. They show up here and at checkout." />}
        renderItem={({ item }) => (
          <View style={[styles.voucherCard, item.used && { opacity: 0.5 }]} testID={`loyalty-voucher-${item.id}`}>
            <View style={styles.voucherIcon}>
              <Ionicons name="pricetag-outline" size={20} color={colors.amberText} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={type.h3}>{item.title}</Text>
              <Text style={type.bodyMuted}>{item.description}</Text>
              <Text style={type.small}>{item.minSpend ? `Min spend RM ${item.minSpend}` : "No minimum spend"}</Text>
            </View>
            {/* A label, not a button: vouchers are applied on the checkout screen. */}
            <Text style={[styles.redeemText, item.used && { color: colors.stoneText }]}>{item.used ? "Used" : "Use at\ncheckout"}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, paddingBottom: 140 },
  pointsCard: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.xl },
  pointsLabel: { color: colors.stoneSoft, fontSize: 15, ...font.display },
  points: { color: colors.white, fontSize: 40, ...font.displayExtraBold, letterSpacing: -0.8, marginTop: 2, fontVariant: ["tabular-nums"] },
  pointsUnit: { color: colors.turmeric, fontSize: 18, ...font.displayBold, letterSpacing: 0 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)", marginTop: spacing.lg, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: colors.turmeric, borderRadius: 4 },
  progressHint: { color: colors.white, fontSize: 15, ...font.displayBold, marginTop: spacing.md },
  progressNote: { color: colors.stoneSoft, fontSize: 13, ...font.serif, marginTop: 2 },
  section: { ...font.displayExtraBold, fontSize: 20, color: colors.ink, letterSpacing: -0.3, marginTop: layout.section, marginBottom: spacing.md },
  voucherCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.stoneLine, gap: spacing.md },
  voucherIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.amberTint, alignItems: "center", justifyContent: "center" },
  redeemText: { ...font.displayBold, fontSize: 13, color: colors.amberText, textAlign: "right" },
});
