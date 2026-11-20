import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Merchant } from "../../../shared/api/types";
import { BUSY_STYLE, busyOf, waitOf } from "../canteenMap";
import { fonts } from "../../../shared/theme/theme";

// Feature 2: "Ready in 8 min" for a stall, coloured like the canteen map (green / amber / red / grey).
// "chip" for info rows (Stall menu, Dish detail); "text" for small inline meta lines (cards).
export const readyText = (m: Merchant) => (m.openNow ? `Ready in ${waitOf(m)} min` : `Opens ${m.hours.open}`);

export default function ReadyChip({ merchant, variant = "chip" }: { merchant: Merchant; variant?: "chip" | "text" }) {
  const s = BUSY_STYLE[busyOf(merchant)];
  const label = readyText(merchant);
  if (variant === "text") {
    return (
      <View style={styles.inline} accessibilityLabel={label}>
        <View style={[styles.dot, { backgroundColor: s.dot }]} />
        <Text style={[styles.inlineText, { color: s.text }]} numberOfLines={1}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.chip, { backgroundColor: s.fill }]} accessibilityLabel={label} testID={`ready-${merchant.id}`}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.chipText, { color: s.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontFamily: fonts.displayBold, fontSize: 12 },
  inline: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  inlineText: { fontFamily: fonts.displayBold, fontSize: 11.5, flexShrink: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
