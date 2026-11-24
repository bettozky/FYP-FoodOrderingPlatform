import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Merchant } from "../../../shared/api/types";
import { BUSY_STYLE, busySummary } from "../canteenMap";
import { colors, layout, radius, spacing, ui, font } from "../../../shared/theme/theme";
import { useTranslation } from "react-i18next";

// Home entry to the Live Canteen Map: "Live canteen map · 3 quiet · 1 busy". Opens CanteenMapScreen.
export default function CanteenMapCard({ merchants, onPress }: { merchants: Merchant[]; onPress: () => void }) {
  const { t } = useTranslation();
  const summary = busySummary(merchants);
  if (!merchants.length) return null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={`${t("home.liveMap")}. ${summary.map((s) => `${s.count} ${BUSY_STYLE[s.level].label.toLowerCase()}`).join(", ")}`}
      testID="canteen-map-card"
    >
      <View style={styles.icon}>
        <Ionicons name="map" size={20} color={colors.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t("home.liveMap")}</Text>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t("home.liveBadge")}</Text>
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
      <Ionicons name="chevron-forward" size={17} color={colors.stoneSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginHorizontal: layout.gutter, marginTop: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...font.displayBold, fontSize: 16, color: colors.ink },
  live: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.chiliSoft, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.chili },
  liveText: { ...font.displayBold, fontSize: 11, color: colors.chiliText, letterSpacing: 0.4 },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  count: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  countText: { ...font.display, fontSize: 13, color: colors.stoneText },
});
