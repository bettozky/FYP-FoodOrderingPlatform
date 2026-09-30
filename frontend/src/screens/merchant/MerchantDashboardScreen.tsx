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
import { merchantStats, merchantIncomingOrders } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type, fonts } from "../../theme/theme";

type StoreStatus = "online" | "dine_in" | "offline";

export default function MerchantDashboardScreen({ navigation }: any) {
  const { setRole } = useAuth();
  const pendingCount = merchantIncomingOrders.filter((o) => o.status !== "delivered").length;

  // 0 = Online, 1 = Dine-In, 2 = Offline
  const [storeStatus, setStoreStatus] = useState<StoreStatus>("online");
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Configuration for each status
  const statusConfig = {
    online: {
      index: 0,
      label: "Online",
      color: "#10b981",
      bgColor: "#ecfdf5",
      borderColor: "#a7f3d0",
      description: "🟢 Accepting all incoming delivery, takeaway, and dine-in orders.",
    },
    dine_in: {
      index: 1,
      label: "Dine-In",
      color: "#f59e0b",
      bgColor: "#fffbeb",
      borderColor: "#fde68a",
      description: "🟡 Delivery paused. Kitchen accepting table orders & reservations only.",
    },
    offline: {
      index: 2,
      label: "Offline",
      color: "#ef4444",
      bgColor: "#fef2f2",
      borderColor: "#fecaca",
      description: "🔴 Store closed. Not accepting any new orders right now.",
    },
  };

  // Switch handler with smooth sliding animation
  const handleStatusChange = (status: StoreStatus) => {
    setStoreStatus(status);
    const targetValue = statusConfig[status].index;

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

  // Calculate sliding distance per stop
  const itemWidth = trackWidth > 0 ? (trackWidth - 8) / 3 : 0;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, itemWidth, itemWidth * 2],
  });

  const activeMode = statusConfig[storeStatus];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        {/* ================= HEADER ROW ================= */}
        <View style={styles.headerRow}>
          <View>
            <Text style={type.bodyMuted}>Ah Seng Noodle House</Text>
            <Text style={type.h1}>Merchant dashboard</Text>
          </View>
          <Pressable
            style={({ hovered }: any) => [styles.exitBtn, hovered && styles.btnHover]}
            onPress={() => {
              setRole("customer");
              navigation.navigate("MainTabs");
            }}
          >
            <Text style={styles.exitBtnText}>Exit</Text>
          </Pressable>
        </View>

        {/* ================= SLIDING STATUS SWITCH ================= */}
        <View style={styles.switchSection}>
          <Text style={[type.small, { fontWeight: "700", marginBottom: spacing.xs }]}>
            STORE OPERATING STATUS
          </Text>

          {/* Sliding Pill Container */}
          <View style={styles.segmentedTrack} onLayout={handleLayout}>
            {/* Smooth Floating Pill */}
            {trackWidth > 0 && (
              <Animated.View
                style={[
                  styles.slidingPill,
                  {
                    width: itemWidth,
                    transform: [{ translateX }],
                    borderColor: activeMode.borderColor,
                  },
                ]}
              />
            )}

            {/* Segment 1: Online */}
            <Pressable
              style={styles.segmentBtn}
              onPress={() => handleStatusChange("online")}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  storeStatus === "online" && { color: "#065f46", fontWeight: "700" },
                ]}
              >
                Online
              </Text>
            </Pressable>

            {/* Segment 2: Dine-In Only */}
            <Pressable
              style={styles.segmentBtn}
              onPress={() => handleStatusChange("dine_in")}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  storeStatus === "dine_in" && { color: "#92400e", fontWeight: "700" },
                ]}
              >
                Dine-In
              </Text>
            </Pressable>

            {/* Segment 3: Offline */}
            <Pressable
              style={styles.segmentBtn}
              onPress={() => handleStatusChange("offline")}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  storeStatus === "offline" && { color: "#991b1b", fontWeight: "700" },
                ]}
              >
                Offline
              </Text>
            </Pressable>
          </View>

          {/* Live Action Feedback Banner */}
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: activeMode.bgColor, borderColor: activeMode.borderColor },
            ]}
          >
            <Text style={[styles.statusBannerText, { color: activeMode.color }]}>
              {activeMode.description}
            </Text>
          </View>
        </View>

        {/* ================= STATS ROW ================= */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{merchantStats.todayOrders}</Text>
            <Text style={type.small}>Orders today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>RM {merchantStats.todayRevenue.toFixed(0)}</Text>
            <Text style={type.small}>Revenue today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{merchantStats.avgPrepMinutes}m</Text>
            <Text style={type.small}>Avg. prep time</Text>
          </View>
        </View>

        {/* ================= NAVIGATION CARDS ================= */}
        <Pressable
          style={({ hovered }: any) => [styles.navCard, hovered && styles.btnHover]}
          onPress={() => navigation.navigate("MerchantOrderQueue")}
        >
          <Text style={{ fontSize: 22 }}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Incoming orders</Text>
            <Text style={type.bodyMuted}>
              {pendingCount} order{pendingCount !== 1 ? "s" : ""} need attention
            </Text>
          </View>
          <Badge label={String(pendingCount)} tone="primary" />
        </Pressable>

        <Pressable
          style={({ hovered }: any) => [styles.navCard, hovered && styles.btnHover]}
          onPress={() => navigation.navigate("MerchantMenu")}
        >
          <Text style={{ fontSize: 22 }}>🍜</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Menu management</Text>
            <Text style={type.bodyMuted}>Update dishes, prices, and sold-out status</Text>
          </View>
          <Text style={{ color: colors.textFaint }}>{"›"}</Text>
        </Pressable>

        <Pressable
          style={({ hovered }: any) => [styles.navCard, hovered && styles.btnHover]}
          onPress={() => navigation.navigate("MerchantVouchers")}
        >
          <Text style={{ fontSize: 22 }}>🎟️</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Promotions & Vouchers</Text>
            <Text style={type.bodyMuted}>
              Create discount codes, set limits, track remaining stock & cost spent
            </Text>
          </View>
          <Text style={{ color: colors.textFaint }}>{"›"}</Text>
        </Pressable>
        <Pressable
          style={({ hovered }: any) => [styles.navCard, hovered && styles.btnHover]}
          onPress={() => navigation.navigate("MerchantAnalytics")}
        >
          <Text style={{ fontSize: 22 }}>📈</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Sales reports & analytics</Text>
            <Text style={type.bodyMuted}>
              Revenue overview, cost, profit margins, and best-selling dishes
            </Text>
          </View>
          <Text style={{ color: colors.textFaint }}>{"›"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  exitBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exitBtnText: { fontSize: 13, fontFamily: fonts.display, color: colors.text },

  /* --- Clean Segmented Sliding Switch --- */
  switchSection: {
    marginTop: spacing.sm,
  },
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
    borderWidth: 1,
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
    cursor: "pointer",
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: fonts.display,
    color: colors.textMuted || "#64748b",
  },
  statusBanner: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* --- Hover & Card Styles --- */
  btnHover: {
    transform: [{ translateY: -2 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  statValue: { fontSize: 18, fontFamily: fonts.displayExtraBold, color: colors.text },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
