import React, { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { api } from "../../../shared/api/client";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import { colors, radius, spacing, type, font, layout, shadow, ui } from "../../../shared/theme/theme";
import i18n, { locale } from "../../../shared/i18n";
import { useTranslation } from "react-i18next";

// Chart labels come from the server in English ("Mon", "Wk1", "10am"); show day and week names in the app language.
const DAY_KEY: Record<string, string> = { Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat" };
const barLabel = (l: string) => {
  if (DAY_KEY[l]) return i18n.t(`days.${DAY_KEY[l]}Short` as "days.monShort");
  const wk = l.match(/^Wk(\d)$/);
  return wk ? i18n.t("analytics.week", { n: wk[1] }) : l;
};

type TimePeriod = "daily" | "weekly" | "monthly";

interface BestSellerItem {
  id: string;
  name: string;
  category: string;
  soldQty: number;
  revenue: number;
  lastMonthQty: number;
  growthPct: number;
}

export default function MerchantAnalyticsScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<TimePeriod>("monthly");
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const slideAnim = useRef(new Animated.Value(2)).current; // Default to Monthly (index 2)

  const periodConfig = {
    daily: { index: 0, label: "Daily" },
    weekly: { index: 1, label: "Weekly" },
    monthly: { index: 2, label: "Monthly" },
  };

  const handlePeriodChange = (selected: TimePeriod) => {
    setPeriod(selected);
    const targetValue = periodConfig[selected].index;

    Animated.spring(slideAnim, {
      toValue: targetValue,
      damping: 20,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const itemWidth = trackWidth > 0 ? (trackWidth - 8) / 3 : 0;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, itemWidth, itemWidth * 2],
  });

  type Metrics = {
    revenue: number; cost: number; profit: number; profitMargin: string; revenueGrowthPct: number | null;
    trafficOrders: number; dineInTraffic: number; deliveryTraffic: number; avgOrderValue: number;
    chartBars: { label: string; value: number; heightPct: string }[]; bestSellers: BestSellerItem[];
  };
  const emptyMetrics: Metrics = {
    revenue: 0, cost: 0, profit: 0, profitMargin: "0.0%", revenueGrowthPct: null, trafficOrders: 0,
    dineInTraffic: 0, deliveryTraffic: 0, avgOrderValue: 0, chartBars: [], bestSellers: [],
  };
  // Real numbers from the backend (FR-5.12), refreshed whenever the period changes.
  const [currentMetrics, setMetrics] = useState<Metrics>(emptyMetrics);
  useEffect(() => {
    const load = () => api<Metrics>("GET", `/merchant/analytics?period=${period}`).then(setMetrics).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [period]);
  const bestSellers = currentMetrics.bestSellers;

  const highestSoldQty = Math.max(1, ...bestSellers.map((b) => b.soldQty));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={t("dash.analytics")}
        subtitle={t("analytics.subtitle")}
      />

      <ScrollView contentContainerStyle={styles.wrap}>
        {/* ================= 1. SLIDING TIMEFRAME SELECTOR ================= */}
        <View style={styles.segmentedTrack} onLayout={handleLayout}>
          {trackWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingPill,
                {
                  width: itemWidth,
                  transform: [{ translateX }],
                },
              ]}
            />
          )}

          <Pressable
            style={styles.segmentBtn}
            onPress={() => handlePeriodChange("daily")}
          >
            <Text
              style={[
                styles.segmentLabel,
                period === "daily" && { color: colors.primary, fontWeight: "700" },
              ]}
            >
              {t("analytics.daily")}
            </Text>
          </Pressable>

          <Pressable
            style={styles.segmentBtn}
            onPress={() => handlePeriodChange("weekly")}
          >
            <Text
              style={[
                styles.segmentLabel,
                period === "weekly" && { color: colors.primary, fontWeight: "700" },
              ]}
            >
              {t("analytics.weekly")}
            </Text>
          </Pressable>

          <Pressable
            style={styles.segmentBtn}
            onPress={() => handlePeriodChange("monthly")}
          >
            <Text
              style={[
                styles.segmentLabel,
                period === "monthly" && { color: colors.primary, fontWeight: "700" },
              ]}
            >
              {t("analytics.monthly")}
            </Text>
          </Pressable>
        </View>

        {/* ================= 2. CORE FINANCIAL METRICS ================= */}
        <View style={styles.statsGrid}>
          {/* Revenue */}
          <View style={styles.statCard}>
            <Text style={type.small}>{t("analytics.gross")}</Text>
            <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              RM {currentMetrics.revenue.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={{ fontSize: 12, color: (currentMetrics.revenueGrowthPct ?? 0) >= 0 ? colors.herb : colors.chiliText, ...font.displayBold }}>
              {currentMetrics.revenueGrowthPct === null ? t("analytics.noPrevious") : t(`analytics.vs_${period}`, { pct: `${currentMetrics.revenueGrowthPct >= 0 ? "+" : ""}${currentMetrics.revenueGrowthPct}` })}
            </Text>
          </View>

          {/* Operating Cost */}
          <View style={styles.statCard}>
            <Text style={type.small}>{t("analytics.cost")}</Text>
            <Text style={[styles.statValue, { color: colors.chiliText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              RM {currentMetrics.cost.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={{ fontSize: 11, color: colors.stoneText }}>
              {t("analytics.costParts")}
            </Text>
          </View>

          {/* Net Profit */}
          <View style={styles.statCard}>
            <Text style={type.small}>{t("analytics.net")}</Text>
            <Text style={[styles.statValue, { color: colors.herb }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              RM {currentMetrics.profit.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Badge label={t("analytics.margin", { pct: currentMetrics.profitMargin })} tone="success" />
          </View>

          {/* Average Order Value */}
          <View style={styles.statCard}>
            <Text style={type.small}>{t("analytics.aov")}</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              RM {currentMetrics.avgOrderValue.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.stoneText }}>{t("analytics.perTx")}</Text>
          </View>
        </View>

        {/* ================= 3. CUSTOMER TRAFFIC BREAKDOWN ================= */}
        <View style={styles.card}>
          <Text style={type.h3}>{t("analytics.traffic")}</Text>
          <Text style={type.bodyMuted}>
            {t("analytics.volume", { n: currentMetrics.trafficOrders })}
          </Text>

          <View style={styles.trafficRow}>
            {/* Dine-in Traffic */}
            <View style={styles.trafficBlock}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="restaurant-outline" size={18} color={colors.amberText} />
                <Text style={type.body}>{t("analytics.dineIn")}</Text>
              </View>
              <Text style={styles.trafficCount}>{currentMetrics.dineInTraffic}</Text>
              <Text style={type.small}>
                {t("analytics.share", { pct: currentMetrics.trafficOrders ? ((currentMetrics.dineInTraffic / currentMetrics.trafficOrders) * 100).toFixed(0) : 0 })}
              </Text>
            </View>

            {/* Delivery Traffic */}
            <View style={styles.trafficBlock}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="bicycle-outline" size={18} color={colors.amberText} />
                <Text style={type.body}>{t("analytics.delivery")}</Text>
              </View>
              <Text style={styles.trafficCount}>{currentMetrics.deliveryTraffic}</Text>
              <Text style={type.small}>
                {t("analytics.share", { pct: currentMetrics.trafficOrders ? ((currentMetrics.deliveryTraffic / currentMetrics.trafficOrders) * 100).toFixed(0) : 0 })}
              </Text>
            </View>
          </View>
        </View>

        {/* ================= 4. REVENUE TREND VISUAL CHART ================= */}
        <View style={styles.card}>
          <Text style={type.h3}>{t("analytics.trend")}</Text>
          <Text style={type.bodyMuted}>{t(`analytics.across_${period}`)}</Text>

          <View style={styles.chartContainer}>
            {currentMetrics.chartBars.map((bar, idx) => (
              <View key={idx} style={styles.chartCol}>
                <Text style={styles.chartBarValue}>
                  {bar.value >= 1000 ? `${(bar.value / 1000).toFixed(1)}k` : bar.value}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: bar.heightPct as any }]} />
                </View>
                <Text style={styles.chartLabel}>{barLabel(bar.label)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ================= 5. BEST-SELLING ITEMS (RESPONSIVE PHONE FIX) ================= */}
        <View style={styles.card}>
          <Text style={type.h3}>{t("analytics.best")}</Text>
          <Text style={type.bodyMuted}>
            {t("analytics.bestHint")}
          </Text>

          <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
            {bestSellers.map((item, index) => {
              const contributionPct = (item.soldQty / highestSoldQty) * 100;
              const isPositive = item.growthPct >= 0;

              return (
                <View key={item.id} style={styles.sellerRow}>
                  <View style={styles.sellerTopRow}>
                    {/* Left Section: Rank + Name + Orders (flex: 1 prevents pushing right side out) */}
                    <View style={styles.sellerLeftCol}>
                      <Text style={styles.rankNum}>#{index + 1}</Text>
                      <View style={styles.sellerTitleWrap}>
                        <Text
                          style={[type.body, { fontWeight: "700" }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.name}
                        </Text>
                        <Text style={type.small}>
                          {item.category} · {t("analytics.orders", { n: item.soldQty })}
                        </Text>
                      </View>
                    </View>

                    {/* Right Section: Revenue + Compact Growth Badge (flexShrink: 0 keeps it locked in box) */}
                    <View style={styles.sellerRightCol}>
                      <Text style={styles.revenueText}>
                        RM {item.revenue.toFixed(2)}
                      </Text>
                      <View
                        style={[
                          styles.growthBadge,
                          isPositive ? styles.growthPos : styles.growthNeg,
                        ]}
                      >
                        <Text
                          style={[
                            styles.growthBadgeText,
                            { color: isPositive ? colors.herb : colors.chiliText },
                          ]}
                        >
                          {isPositive ? `▲ +${item.growthPct}%` : `▼ ${item.growthPct}%`}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Visual Proportion Bar */}
                  <View style={styles.proportionTrack}>
                    <View
                      style={[
                        styles.proportionFill,
                        { width: `${contributionPct}%` as any },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingVertical: spacing.md, paddingBottom: spacing.xxl * 1.5, gap: spacing.md, width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" },

  segmentedTrack: { position: "relative", flexDirection: "row", backgroundColor: colors.paperDim, borderRadius: 12, padding: 3, height: 42, alignItems: "center" },
  slidingPill: { position: "absolute", top: 3, bottom: 3, left: 3, backgroundColor: colors.white, borderRadius: 9, ...shadow.soft, zIndex: 1 },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    zIndex: 2,
  },
  segmentLabel: { fontSize: 14, ...font.display, color: colors.stoneText },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statCard: { flex: 1, minWidth: "46%", ...ui.card, padding: spacing.lg, gap: 4 },
  statValue: { fontSize: 22, ...font.displayExtraBold, letterSpacing: -0.4, fontVariant: ["tabular-nums"] },

  card: { ...ui.card, padding: spacing.lg, gap: spacing.sm },

  trafficRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  trafficBlock: { flex: 1, backgroundColor: colors.paperDim, borderRadius: radius.sm, padding: spacing.md, gap: 2 },
  trafficCount: { fontSize: 24, ...font.displayExtraBold, color: colors.ink, letterSpacing: -0.4, fontVariant: ["tabular-nums"] },

  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 160,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    gap: 4,
  },
  barTrack: { width: 24, height: 100, backgroundColor: colors.paperDim, borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", backgroundColor: colors.ink, borderRadius: 8 },
  chartBarValue: { fontSize: 12, color: colors.stoneText, ...font.display, fontVariant: ["tabular-nums"] },
  chartLabel: { fontSize: 12, color: colors.ink, ...font.display },

  /* Best Sellers List (Responsive Layout) */
  sellerRow: {
    gap: 6,
  },
  sellerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sellerLeftCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: spacing.sm,
  },
  rankNum: { fontSize: 15, ...font.displayExtraBold, color: colors.stoneText, width: 26, fontVariant: ["tabular-nums"] },
  sellerTitleWrap: {
    flex: 1,
  },
  sellerRightCol: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 2,
  },
  revenueText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  growthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill || 12,
  },
  growthPos: {
    backgroundColor: colors.herbLight,
  },
  growthNeg: {
    backgroundColor: colors.chiliSoft,
  },
  growthBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  proportionTrack: {
    height: 6,
    backgroundColor: colors.paperDim,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  proportionFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
});