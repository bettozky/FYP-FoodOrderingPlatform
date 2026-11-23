// Sprint 3 "prep forecast". Route: navigation.navigate("MerchantForecast") (Dashboard → Prep forecast).
// How many of each dish the stall will probably sell tomorrow (or any weekday), from the same weekday in the last
// 4 weeks, with recent weeks counting more. Each dish shows the number to prep, a bar, the past weeks as mini bars
// and whether it is going up or down. GET /merchant/forecast?day=tomorrow | 0..6
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorText } from "../../shared/api/client";
import ScreenHeader from "../../shared/components/ScreenHeader";
import EmptyState from "../../shared/components/EmptyState";
import { colors, radius, shadow, spacing, type, font, layout } from "../../shared/theme/theme";

type DishForecast = { dishId: string; name: string; expected: number; low: number; high: number; history: number[]; trend: "up" | "down" | "flat" };
type Forecast = { date: string; weekday: number; dates: string[]; expectedOrders: number; rushHour: number | null; dishes: DishForecast[] };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PICKS: { key: string; label: string }[] = [{ key: "tomorrow", label: "Tomorrow" }, ...[1, 2, 3, 4, 5, 6, 0].map((d) => ({ key: String(d), label: DAYS[d]! }))];

const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const hourText = (h: number) => `${String(h).padStart(2, "0")}:00–${String((h + 1) % 24).padStart(2, "0")}:00`;

export default function MerchantForecastScreen() {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState("tomorrow");
  const [f, setF] = useState<Forecast | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api<{ forecast: Forecast }>("GET", `/merchant/forecast?day=${day}`)
      .then((r) => setF(r.forecast))
      .catch((e) => setError(errorText(e)));
  }, [day]);

  const max = Math.max(1, ...(f?.dishes.map((d) => d.high) ?? [1]));
  const top = f?.dishes[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Prep forecast" subtitle="What you'll probably sell, from past weeks" />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {PICKS.map((p) => (
            <Pressable key={p.key} onPress={() => setDay(p.key)} style={[styles.dayChip, day === p.key && styles.dayChipOn]} accessibilityRole="radio" accessibilityState={{ selected: day === p.key }} testID={`forecast-day-${p.key}`}>
              <Text style={[styles.dayText, day === p.key && styles.dayTextOn]}>{p.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {f ? (
          <>
            <View style={styles.hero} testID="forecast-hero">
              <Text style={styles.heroLabel}>{LONG[f.weekday]!.toUpperCase()} · {shortDate(f.date)}</Text>
              <View style={styles.heroRow}>
                <HeroStat icon="receipt-outline" value={`~${f.expectedOrders}`} label="orders" />
                <HeroStat icon="flame-outline" value={f.rushHour !== null ? hourText(f.rushHour) : "–"} label="rush hour" />
                <HeroStat icon="restaurant-outline" value={top ? `${top.expected}` : "–"} label={top ? top.name : "top dish"} />
              </View>
              <Text style={styles.heroHint}>
                {f.dates.length ? `Based on the last ${f.dates.length} ${LONG[f.weekday]}${f.dates.length === 1 ? "" : "s"} (${f.dates.map(shortDate).join(", ")}). Recent weeks count more.` : "Not enough past orders yet."}
              </Text>
            </View>

            {f.dishes.length === 0 ? (
              <EmptyState icon="analytics-outline" title="No forecast yet" hint={`Once you have orders on a ${LONG[f.weekday]}, your forecast for that day appears here.`} />
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Portions to prep</Text>
                {f.dishes.map((d, i) => <DishRow key={d.dishId} d={d} max={max} index={i} dates={f.dates} />)}
                <View style={styles.tip}>
                  <Ionicons name="bulb-outline" size={16} color={colors.amberText} />
                  <Text style={styles.tipText}>The orange bar is how many to prep; the light band behind it is the range seen on past {LONG[f.weekday]}s. Keep a little extra for dishes trending up.</Text>
                </View>
              </View>
            )}
          </>
        ) : !error ? (
          <Text style={type.bodyMuted}>Working it out…</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function HeroStat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Ionicons name={icon} size={16} color={colors.turmeric} />
      <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.heroStatLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function DishRow({ d, max, index, dates }: { d: DishForecast; max: number; index: number; dates: string[] }) {
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: 500, delay: index * 60, useNativeDriver: false }).start();
  }, [d.expected, d.high, index, grow]);
  const pct = (n: number) => (n / max) * 100;
  const trendIcon = d.trend === "up" ? "trending-up" : d.trend === "down" ? "trending-down" : "remove";
  const trendColour = d.trend === "up" ? colors.herb : d.trend === "down" ? colors.chiliText : colors.stone;
  const histMax = Math.max(1, ...d.history);

  return (
    <View style={styles.dish} testID={`forecast-${d.dishId}`} accessibilityLabel={`${d.name}: prep about ${d.expected}. Past weeks ${d.history.join(", ")}. Trend ${d.trend}.`}>
      <View style={styles.dishTop}>
        <Text style={styles.dishName} numberOfLines={1}>{d.name}</Text>
        <Ionicons name={trendIcon} size={16} color={trendColour} />
        <Text style={styles.dishNum}>{d.expected}</Text>
      </View>
      <View style={styles.track}>
        {/* range seen on past weeks */}
        <Animated.View style={[styles.range, { left: `${pct(d.low)}%` as `${number}%`, width: grow.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${Math.max(2, pct(d.high - d.low))}%`] }) }]} />
        {/* expected */}
        <Animated.View style={[styles.expected, { width: grow.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${Math.max(2, pct(d.expected))}%`] }) }]} />
      </View>
      <View style={styles.histRow}>
        {d.history.map((n, i) => (
          <View key={i} style={styles.histCol}>
            <View style={styles.histTrack}>
              <View style={[styles.histBar, { height: `${Math.round((n / histMax) * 100)}%` as `${number}%`, backgroundColor: i === d.history.length - 1 ? colors.turmeric : colors.stoneLine }]} />
            </View>
            <Text style={styles.histLabel}>{n} · {dates[i] ? shortDate(dates[i]!) : ""}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, paddingVertical: spacing.md, gap: spacing.md },
  days: { gap: spacing.sm, paddingBottom: spacing.xs },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  dayChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  dayText: { ...font.display, fontSize: 13, color: colors.ink },
  dayTextOn: { color: colors.white, ...font.displayBold },
  error: { ...font.displayBold, color: colors.chiliText },
  hero: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  heroLabel: { fontSize: 11, ...font.displayBold, color: colors.textFaint },
  heroRow: { flexDirection: "row" },
  heroStat: { flex: 1, alignItems: "center", gap: 3, paddingHorizontal: 4 },
  heroValue: { fontSize: 20, ...font.displayExtraBold, color: colors.white },
  heroStatLabel: { fontSize: 12, ...font.display, color: colors.textFaint },
  heroHint: { fontSize: 12, ...font.display, color: colors.textFaint },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.lg, ...shadow.soft },
  cardTitle: { fontSize: 15, ...font.displayBold, color: colors.ink },
  dish: { gap: 6 },
  dishTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dishName: { flex: 1, fontSize: 14, ...font.displayBold, color: colors.ink },
  dishNum: { fontSize: 22, ...font.displayExtraBold, color: colors.ink, minWidth: 30, textAlign: "right" },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.paperDim, overflow: "hidden", position: "relative" },
  range: { position: "absolute", top: 0, bottom: 0, backgroundColor: colors.amberTint, borderRadius: 6 },
  expected: { position: "absolute", left: 0, top: 3, bottom: 3, backgroundColor: colors.turmeric, borderRadius: 3 },
  histRow: { flexDirection: "row", gap: 6 },
  histCol: { flex: 1, alignItems: "center", gap: 2 },
  histTrack: { width: "100%", height: 22, justifyContent: "flex-end" },
  histBar: { width: "100%", borderRadius: 3, minHeight: 2 },
  histLabel: { fontSize: 11, ...font.display, color: colors.stoneText },
  tip: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: colors.amberTint, borderRadius: radius.sm, padding: spacing.md },
  tipText: { flex: 1, fontSize: 12, ...font.display, color: colors.amberText },
});
