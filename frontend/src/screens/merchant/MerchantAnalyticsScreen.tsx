import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import ScreenHeader from "../../components/ScreenHeader";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type, fonts } from "../../theme/theme";

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

  const metricsData = {
    daily: {
      revenue: 1420.0,
      cost: 580.0,
      profit: 840.0,
      profitMargin: "59.1%",
      trafficOrders: 58,
      dineInTraffic: 36,
      deliveryTraffic: 22,
      avgOrderValue: 24.48,
      chartBars: [
        { label: "10am", value: 120, heightPct: "30%" },
        { label: "12pm", value: 380, heightPct: "95%" },
        { label: "2pm", value: 210, heightPct: "50%" },
        { label: "4pm", value: 140, heightPct: "35%" },
        { label: "6pm", value: 320, heightPct: "80%" },
        { label: "8pm", value: 250, heightPct: "65%" },
      ],
    },
    weekly: {
      revenue: 9650.0,
      cost: 4100.0,
      profit: 5550.0,
      profitMargin: "57.5%",
      trafficOrders: 395,
      dineInTraffic: 245,
      deliveryTraffic: 150,
      avgOrderValue: 24.43,
      chartBars: [
        { label: "Mon", value: 1100, heightPct: "50%" },
        { label: "Tue", value: 1350, heightPct: "65%" },
        { label: "Wed", value: 1200, heightPct: "55%" },
        { label: "Thu", value: 1400, heightPct: "70%" },
        { label: "Fri", value: 1750, heightPct: "88%" },
        { label: "Sat", value: 1980, heightPct: "100%" },
        { label: "Sun", value: 1870, heightPct: "94%" },
      ],
    },
    monthly: {
      revenue: 41800.0,
      cost: 17200.0,
      profit: 24600.0,
      profitMargin: "58.8%",
      trafficOrders: 1680,
      dineInTraffic: 1040,
      deliveryTraffic: 640,
      avgOrderValue: 24.88,
      chartBars: [
        { label: "May", value: 34000, heightPct: "75%" },
        { label: "Jun", value: 37500, heightPct: "82%" },
        { label: "Jul", value: 39200, heightPct: "88%" },
        { label: "Aug", value: 38600, heightPct: "85%" },
        { label: "Sep", value: 41800, heightPct: "100%" },
      ],
    },
  };

  const currentMetrics = metricsData[period];

  const bestSellers: BestSellerItem[] = [
    {
      id: "D1",
      name: "Ah Seng Signature Kolo Mee",
      category: "Mains",
      soldQty: 540,
      revenue: 5130.0,
      lastMonthQty: 480,
      growthPct: 12.5,
    },
    {
      id: "D2",
      name: "Sarawak Laksa Special",
      category: "Mains",
      soldQty: 420,
      revenue: 5040.0,
      lastMonthQty: 390,
      growthPct: 7.7,
    },
    {
      id: "D3",
      name: "Crispy Roasted Pork Rice",
      category: "Rice",
      soldQty: 310,
      revenue: 3875.0,
      lastMonthQty: 330,
      growthPct: -6.0,
    },
    {
      id: "D4",
      name: "Three Layer Iced Tea (Teh C Peng)",
      category: "Drinks",
      soldQty: 680,
      revenue: 3060.0,
      lastMonthQty: 590,
      growthPct: 15.2,
    },
  ];

  const highestSoldQty = Math.max(...bestSellers.map((b) => b.soldQty));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title="Sales Reports & Analytics"
        subtitle="Revenue, cost breakdown, and customer traffic insights"
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
              Daily
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
              Weekly
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
              Monthly
            </Text>
          </Pressable>
        </View>

        {/* ================= 2. CORE FINANCIAL METRICS ================= */}
        <View style={styles.statsGrid}>
          {/* Revenue */}
          <View style={styles.statCard}>
            <Text style={type.small}>Gross Revenue</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              RM {currentMetrics.revenue.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 11, color: "#10b981", fontWeight: "600" }}>
              +8.4% vs prev {period}
            </Text>
          </View>

          {/* Operating Cost */}
          <View style={styles.statCard}>
            <Text style={type.small}>Total Cost & Fees</Text>
            <Text style={[styles.statValue, { color: "#dc2626" }]}>
              RM {currentMetrics.cost.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              COGS + Promos + Fees
            </Text>
          </View>

          {/* Net Profit */}
          <View style={styles.statCard}>
            <Text style={type.small}>Net Profit (Margin)</Text>
            <Text style={[styles.statValue, { color: "#059669" }]}>
              RM {currentMetrics.profit.toLocaleString()}
            </Text>
            <Badge label={`${currentMetrics.profitMargin} Margin`} tone="success" />
          </View>

          {/* Average Order Value */}
          <View style={styles.statCard}>
            <Text style={type.small}>Average Order Value</Text>
            <Text style={styles.statValue}>
              RM {currentMetrics.avgOrderValue.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Per transaction</Text>
          </View>
        </View>

        {/* ================= 3. CUSTOMER TRAFFIC BREAKDOWN ================= */}
        <View style={styles.card}>
          <Text style={type.h3}>Customer Traffic & Order Volume</Text>
          <Text style={type.bodyMuted}>
            Total volume: {currentMetrics.trafficOrders} orders placed
          </Text>

          <View style={styles.trafficRow}>
            {/* Dine-in Traffic */}
            <View style={styles.trafficBlock}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 18 }}>🍽️</Text>
                <Text style={type.body}>Dine-In Orders</Text>
              </View>
              <Text style={styles.trafficCount}>{currentMetrics.dineInTraffic}</Text>
              <Text style={type.small}>
                {((currentMetrics.dineInTraffic / currentMetrics.trafficOrders) * 100).toFixed(0)}% of total traffic
              </Text>
            </View>

            {/* Delivery Traffic */}
            <View style={styles.trafficBlock}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 18 }}>🛵</Text>
                <Text style={type.body}>Delivery Orders</Text>
              </View>
              <Text style={styles.trafficCount}>{currentMetrics.deliveryTraffic}</Text>
              <Text style={type.small}>
                {((currentMetrics.deliveryTraffic / currentMetrics.trafficOrders) * 100).toFixed(0)}% of total traffic
              </Text>
            </View>
          </View>
        </View>

        {/* ================= 4. REVENUE TREND VISUAL CHART ================= */}
        <View style={styles.card}>
          <Text style={type.h3}>Revenue Trend Overview</Text>
          <Text style={type.bodyMuted}>Comparison across {period} intervals</Text>

          <View style={styles.chartContainer}>
            {currentMetrics.chartBars.map((bar, idx) => (
              <View key={idx} style={styles.chartCol}>
                <Text style={styles.chartBarValue}>
                  {bar.value >= 1000 ? `${(bar.value / 1000).toFixed(1)}k` : bar.value}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: bar.heightPct as any }]} />
                </View>
                <Text style={styles.chartLabel}>{bar.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ================= 5. BEST-SELLING ITEMS (LAST MONTH COMPARISON) ================= */}
        <View style={styles.card}>
          <Text style={type.h3}>Best-Selling Items & Growth</Text>
          <Text style={type.bodyMuted}>
            Track dish popularity and volume comparison against last month
          </Text>

          <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
            {bestSellers.map((item, index) => {
              const contributionPct = (item.soldQty / highestSoldQty) * 100;
              const isPositive = item.growthPct >= 0;

              return (
                <View key={item.id} style={styles.sellerRow}>
                  <View style={styles.sellerTopRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.rankNum}>#{index + 1}</Text>
                      <View>
                        <Text style={[type.body, { fontWeight: "700" }]}>{item.name}</Text>
                        <Text style={type.small}>{item.category} · {item.soldQty} orders</Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[type.body, { fontWeight: "700" }]}>
                        RM {item.revenue.toFixed(2)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: isPositive ? "#10b981" : "#ef4444",
                        }}
                      >
                        {isPositive ? `▲ +${item.growthPct}%` : `▼ ${item.growthPct}%`} vs last month
                      </Text>
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
  wrap: { padding: spacing.lg, gap: spacing.md },

  segmentedTrack: {
    position: "relative",
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: radius.pill,
    padding: 4,
    height: 44,
    alignItems: "center",
  },
  slidingPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: "#ffffff",
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    zIndex: 2,
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: fonts.display,
    color: "#64748b",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: fonts.displayExtraBold,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },

  trafficRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  trafficBlock: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  trafficCount: {
    fontSize: 20,
    fontFamily: fonts.displayExtraBold,
    color: colors.text,
  },

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
  barTrack: {
    width: 22,
    height: 100,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  chartBarValue: {
    fontSize: 10,
    color: colors.textMuted,
  },
  chartLabel: {
    fontSize: 11,
    color: colors.text,
    fontFamily: fonts.display,
  },

  sellerRow: {
    gap: 6,
  },
  sellerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rankNum: {
    fontSize: 14,
    fontFamily: fonts.displayExtraBold,
    color: colors.textMuted,
    width: 24,
  },
  proportionTrack: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  proportionFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
});
