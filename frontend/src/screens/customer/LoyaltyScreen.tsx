import React from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { loyalty, vouchers } from "../../data/mockData";
import { colors, radius, spacing, type } from "../../theme/theme";

export default function LoyaltyScreen() {
  const progress = Math.min(1, loyalty.points / loyalty.nextTierAt);

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
              {loyalty.nextTierAt - loyalty.points} pts to next tier
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.voucherCard}>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{item.title}</Text>
              <Text style={type.bodyMuted}>{item.description}</Text>
              <Text style={type.small}>Expires in {item.expiresIn}</Text>
            </View>
            <Pressable
              style={[styles.redeemBtn, loyalty.points < item.pointsCost && styles.redeemBtnDisabled]}
              disabled={loyalty.points < item.pointsCost}
            >
              <Text style={styles.redeemBtnText}>{item.pointsCost} pts</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  pointsCard: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  pointsLabel: { color: "#CDEAE0", fontSize: 13, fontWeight: "600" },
  points: { color: colors.white, fontSize: 32, fontWeight: "800", marginTop: 4 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressFill: { height: 8, backgroundColor: colors.white, borderRadius: 4 },
  progressHint: { color: "#CDEAE0", fontSize: 12, marginTop: 6 },
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
  redeemBtnText: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
});
