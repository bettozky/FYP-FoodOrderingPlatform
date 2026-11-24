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
import i18n, { locale } from "../../shared/i18n";
import { useTranslation } from "react-i18next";

type DishForecast = { dishId: string; name: string; expected: number; low: number; high: number; history: number[]; trend: "up" | "down" | "flat" };
type Forecast = { date: string; weekday: number; dates: string[]; expectedOrders: number; rushHour: number | null; dishes: DishForecast[] };

// Day names in the app language (0 = Sunday, as the server counts).
const KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const dayShort = (d: number) => i18n.t(`days.${KEYS[d]!}Short`);
const dayLong = (d: number) => i18n.t(`days.${KEYS[d]!}`);
const picks = (): { key: string; label: string }[] => [{ key: "tomorrow", label: i18n.t("forecast.tomorrow") }, ...[1, 2, 3, 4, 5, 6, 0].map((d) => ({ key: String(d), label: dayShort(d) }))];

const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(locale(), { day: "numeric", month: "short", timeZone: "UTC" });
const hourText = (h: number) => `${String(h).padStart(2, "0")}:00–${String((h + 1) % 24).padStart(2, "0")}:00`;

export default function MerchantForecastScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
      <ScreenHeader title={t("drawer.forecast")} subtitle={t("forecast.subtitle")} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {picks().map((p) => (
            <Pressable key={p.key} onPress={() => setDay(p.key)} style={[styles.dayChip, day === p.key && styles.dayChipOn]} accessibilityRole="radio" accessibilityState={{ selected: day === p.key }} testID={`forecast-day-${p.key}`}>
              <Text style={[styles.dayText, day === p.key && styles.dayTextOn]}>{p.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {f ? (
          <>
            <View style={styles.hero} testID="forecast-hero">
              <Text style={styles.heroLabel}>{dayLong(f.weekday).toUpperCase()} · {shortDate(f.date)}</Text>
              <View style={styles.heroRow}>
                <HeroStat icon="receipt-outline" value={`~${f.expectedOrders}`} label={t("forecast.orders")} />
                <HeroStat icon="flame-outline" value={f.rushHour !== null ? hourText(f.rushHour) : "–"} label={t("forecast.rush")} />
                <HeroStat icon="restaurant-outline" value={top ? `${top.expected}` : "–"} label={top ? top.name : t("forecast.topDish")} />
              </View>
              <Text style={styles.heroHint}>
                {f.dates.length ? t("forecast.basedOn", { count: f.dates.length, day: dayLong(f.weekday), dates: f.dates.map(shortDate).join(t("common.listSep")) }) : t("forecast.notEnough")}
              </Text>
            </View>

            {f.dishes.length === 0 ? (
              <EmptyState icon="analytics-outline" title={t("forecast.none")} hint={t("forecast.noneHint", { day: dayLong(f.weekday) })} />
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("forecast.portions")}</Text>
                {f.dishes.map((d, i) => <DishRow key={d.dishId} d={d} max={max} index={i} dates={f.dates} />)}
                <View style={styles.tip}>
                  <Ionicons name="bulb-outline" size={16} color={colors.amberText} />
                  <Text style={styles.tipText}>{t("forecast.tip", { day: dayLong(f.weekday) })}</Text>
                </View>
              </View>
            )}
          </>
        ) : !error ? (
          <Text style={type.bodyMuted}>{t("forecast.working")}</Text>
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
    <View style={styles.dish} testID={`forecast-${d.dishId}`} accessibilityLabel={i18n.t("forecast.a11y", { name: d.name, n: d.expected, history: d.history.join(", "), trend: i18n.t(`forecast.trend_${d.trend}`) })}>
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
