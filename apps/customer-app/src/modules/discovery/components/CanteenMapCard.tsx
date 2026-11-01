import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Merchant } from "../../../shared/api/types";
import { BUSY_STYLE, busySummary } from "../canteenMap";
import { colors, fonts, radius, spacing, ui } from "../../../shared/theme/theme";

// Home entry to the Live Canteen Map: "Live canteen map · 3 quiet · 1 busy". Opens CanteenMapScreen.
export default function CanteenMapCard({ merchants, onPress }: { merchants: Merchant[]; onPress: () => void }) {
  const summary = busySummary(merchants);
  if (!merchants.length) return null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={`Live canteen map. ${summary.map((s) => `${s.count} ${BUSY_STYLE[s.level].label.toLowerCase()}`).join(", ")}`}
      testID="canteen-map-card"
    >
      <View style={styles.icon}>
        <Ionicons name="map" size={20} color={colors.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Live canteen map</Text>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.counts}>
          {summary.map((s) => (
            <View key={s.level} style={styles.count}>
              <View style={[styles.dot, { backgroundColor: BUSY_STYLE[s.level].dot }]} />
              <Text style={styles.countText}>{s.count} {BUSY_STYLE[s.level].label.toLowerCase()}</Text>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.stone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md },
  icon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.amberTint, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
  live: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.chiliSoft, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.chili },
  liveText: { fontFamily: fonts.displayBold, fontSize: 9.5, color: colors.chiliText, letterSpacing: 0.5 },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  count: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  countText: { fontFamily: fonts.display, fontSize: 12, color: colors.stoneText },
});
