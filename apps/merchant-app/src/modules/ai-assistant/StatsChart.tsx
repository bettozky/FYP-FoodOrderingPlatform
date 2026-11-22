// A small, minimal chart for the assistant's answers (sales by hour, by day, or best sellers).
// The numbers come from the server, never from the AI. Built from plain Views (no chart library):
// it draws instantly on phones and in the browser, and screen readers get the numbers as text.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../../shared/theme/theme";
import type { ChartCard } from "./useMerchantChat";

const COLUMN_HEIGHT = 72; // height of the tallest column

/** "RM12.50" → "RM12.5", "RM120" → "RM120": short labels that fit above a column. */
function short(value: number, unit: ChartCard["unit"]) {
  if (unit === "sold") return `${value}`;
  return value >= 1000 ? `RM${(value / 1000).toFixed(1)}k` : `RM${Math.round(value * 10) / 10}`;
}

export default function StatsChart({ card }: { card: ChartCard }) {
  const max = Math.max(1, ...card.bars.map((b) => b.value));
  const totalText = card.unit === "RM" ? `RM${card.total.toFixed(2)}` : `${card.total} sold`;
  const summary = `${card.title}. ${card.bars.map((b) => `${b.label} ${short(b.value, card.unit)}`).join(", ")}. Total ${totalText}.`;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={summary}>
      <View style={styles.header}>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.total}>{totalText}</Text>
      </View>

      {card.bars.length === 0 ? (
        <Text style={styles.empty}>No sales yet.</Text>
      ) : card.layout === "columns" ? (
        // Sales over time: one column per hour slot or day; the busiest one is highlighted.
        <View style={styles.columns}>
          {card.bars.map((b, i) => {
            const top = b.value === max && b.value > 0;
            return (
              <View key={`${b.label}-${i}`} style={styles.column}>
                <Text style={[styles.value, top && styles.valueTop]} numberOfLines={1}>
                  {b.value > 0 ? short(b.value, card.unit) : ""}
                </Text>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(3, (b.value / max) * COLUMN_HEIGHT) },
                    top ? styles.barTop : b.value === 0 && styles.barEmpty,
                  ]}
                />
                <Text style={styles.label} numberOfLines={1}>
                  {b.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        // Best sellers: one row per dish, longest bar first.
        <View style={styles.rows}>
          {card.bars.map((b, i) => (
            <View key={`${b.label}-${i}`} style={styles.row}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {b.label}
              </Text>
              <View style={styles.rowTrack}>
                <View style={[styles.rowBar, i === 0 && styles.barTop, { width: `${(b.value / max) * 100}%` }]} />
              </View>
              <Text style={styles.rowValue}>{short(b.value, card.unit)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, gap: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontFamily: fonts.serifMedium, fontSize: 12.5, color: colors.stoneText },
  total: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  empty: { fontFamily: fonts.serif, fontSize: 13, color: colors.stoneText },
  columns: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  column: { flex: 1, alignItems: "center", gap: 4 },
  value: { fontFamily: fonts.serif, fontSize: 9.5, color: colors.stoneText },
  valueTop: { fontFamily: fonts.serifSemiBold, color: colors.amberText },
  bar: { width: "100%", borderRadius: 5, backgroundColor: colors.amberSoft },
  barTop: { backgroundColor: colors.turmeric },
  barEmpty: { backgroundColor: colors.stoneLine },
  label: { fontFamily: fonts.serif, fontSize: 10, color: colors.stoneText },
  rows: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { width: 96, fontFamily: fonts.serif, fontSize: 12.5, color: colors.ink },
  rowTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.paperDim, overflow: "hidden" },
  rowBar: { height: "100%", borderRadius: 5, backgroundColor: colors.amberSoft },
  rowValue: { width: 28, textAlign: "right", fontFamily: fonts.serifMedium, fontSize: 12.5, color: colors.ink },
});