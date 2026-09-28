import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { activeOrder, OrderStatus } from "../../data/mockData";
import PrimaryButton from "../../components/PrimaryButton";
import { colors, radius, spacing, type, fonts, shadow } from "../../theme/theme";

const statusOrder: OrderStatus[] = ["placed", "preparing", "ready", "on_the_way", "delivered"];

function RouteMap() {
  return (
    <View style={styles.mapBox}>
      <Svg width="100%" height="100%" viewBox="0 0 284 230">
        <Rect width="284" height="230" fill="#EDEEEA" />
        <Path
          d="M28 200 L28 150 L110 150 L110 95 L200 95 L200 40 L256 40"
          stroke="#D8D6CC"
          strokeWidth={16}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d="M28 200 L28 150 L110 150 L110 95 L200 95 L200 40 L256 40"
          stroke={colors.ink}
          strokeWidth={3}
          fill="none"
          strokeDasharray="1 10"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={28} cy={200} r={9} fill={colors.turmeric} stroke="#fff" strokeWidth={3} />
        <Circle cx={256} cy={40} r={9} fill={colors.ink} stroke="#fff" strokeWidth={3} />
        <Circle cx={110} cy={122} r={12} fill={colors.white} stroke={colors.ink} strokeWidth={2} />
      </Svg>
      <Text style={styles.scooterMarker}>🛵</Text>
    </View>
  );
}

export default function OrderTrackingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const order = activeOrder;
  const currentIndex = statusOrder.findIndex((s) => s === order.status);
  const progress = Math.max(0.08, (currentIndex + 1) / statusOrder.length);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.mapWrap}>
        <RouteMap />
        <View style={[styles.topRow, { top: insets.top + spacing.sm }]}>
          {navigation.canGoBack() && (
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
          )}
          <View style={styles.circleBtn}>
            <Ionicons name="options-outline" size={18} color={colors.ink} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.orderLabel}>Order #{order.id}</Text>

        <View style={[styles.sheet, shadow.card]}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={16} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{order.etaMinutes - 5}–{order.etaMinutes} min</Text>
              <Text style={type.small}>Delivery time</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={16} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>Block D, Student Residence</Text>
              <Text style={type.small}>Delivery address</Text>
            </View>
          </View>

          <View style={styles.courierRow}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderAvatarText}>W</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courierName}>Wei Ming</Text>
              <Text style={styles.courierSub}>Courier · Plate WQA 2201</Text>
            </View>
            <Pressable style={styles.callBtn}>
              <Ionicons name="call" size={16} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.liveMapRow} onPress={() => navigation.navigate("LiveTracking")}>
          <Ionicons name="navigate" size={14} color={colors.turmericDeep} />
          <Text style={styles.liveMapText}>Track on live GPS map</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.turmericDeep} />
        </Pressable>

        <Text style={[type.h2, { fontSize: 17, marginTop: spacing.lg }]}>Order details</Text>
        <View style={styles.card}>
          {order.items.map((it) => (
            <View key={it.dishId} style={styles.summaryLine}>
              <Text style={type.body}>
                {it.qty}x {it.name}
              </Text>
              <Text style={type.body}>RM {(it.price * it.qty).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.summaryLine, { marginTop: spacing.sm }]}>
            <Text style={type.h3}>Total</Text>
            <Text style={type.h3}>RM {order.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Back to home"
          variant="outline"
          onPress={() => navigation.navigate("MainTabs")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 260 },
  mapBox: { flex: 1, overflow: "hidden" },
  scooterMarker: {
    position: "absolute",
    left: "38.7%",
    top: "53%",
    fontSize: 20,
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  topRow: {
    position: "absolute",
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  wrap: { padding: spacing.lg, paddingBottom: 120, marginTop: -20, backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.stoneLine, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: colors.ink },
  orderLabel: { ...type.small, marginTop: spacing.sm, marginBottom: spacing.md },
  sheet: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paperDim,
    alignItems: "center",
    justifyContent: "center",
  },
  courierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.turmeric,
    alignItems: "center",
    justifyContent: "center",
  },
  riderAvatarText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 15 },
  courierName: { color: colors.white, fontFamily: fonts.display, fontSize: 14.5 },
  courierSub: { color: "#B8B3A6", fontFamily: fonts.serif, fontSize: 12, marginTop: 1 },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.turmeric,
    alignItems: "center",
    justifyContent: "center",
  },
  liveMapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.paperDim,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  liveMapText: { flex: 1, fontFamily: fonts.display, fontSize: 13, color: colors.turmericDeep },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  summaryLine: { flexDirection: "row", justifyContent: "space-between" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
