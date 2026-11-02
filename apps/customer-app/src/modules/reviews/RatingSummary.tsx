import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, spacing, type } from "../../shared/theme/theme";
import { StarRow } from "./Stars";
import type { Breakdown } from "./types";

/** Big average + a bar per star level ("5 ★ ▇▇▇▇ 12"). */
export default function RatingSummary({ average, count, breakdown }: { average: number | null; count: number; breakdown?: Breakdown }) {
  const max = Math.max(1, ...(breakdown ?? []).map((b) => b.count));
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Text style={styles.avg}>{average !== null ? average.toFixed(1) : "–"}</Text>
        <StarRow rating={average ?? 0} size={13} />
        <Text style={type.small}>{count} {count === 1 ? "review" : "reviews"}</Text>
      </View>
      <View style={styles.bars}>
        {(breakdown ?? []).map((b) => (
          <View key={b.stars} style={styles.barRow}>
            <Text style={styles.barLabel}>{b.stars}</Text>
            <View style={styles.track}><View style={[styles.fill, { width: `${(b.count / max) * 100}%` }]} /></View>
            <Text style={styles.barCount}>{b.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: spacing.lg, alignItems: "center", marginBottom: spacing.md },
  left: { alignItems: "center", gap: 2, minWidth: 80 },
  avg: { fontFamily: fonts.displayExtraBold, fontSize: 36, color: colors.ink },
  bars: { flex: 1, gap: 4 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barLabel: { width: 12, fontSize: 12, color: colors.stoneText, textAlign: "right" },
  track: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.paperDim, overflow: "hidden" },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.turmeric },
  barCount: { width: 24, fontSize: 12, color: colors.stoneText },
});
