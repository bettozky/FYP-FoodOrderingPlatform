import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  LayoutChangeEvent,
  TextInput,
} from "react-native";
import { api, errorText } from "../../../shared/api/client";
import { useLive } from "../../orders/LiveDataContext";
import { useAuth } from "../../auth/AuthContext";
import NavRow from "../../../shared/components/NavRow";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, type, fonts, shadow } from "../../../shared/theme/theme";

type StoreStatus = "online" | "dine_in" | "offline";

export default function MerchantDashboardScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { orders, reservations, profile, refresh } = useLive();
  const pendingCount = orders.filter((o) => o.status === "awaiting_merchant" || o.status === "preparing").length;
  const pendingReservations = reservations.filter((r) => r.status === "awaiting_restaurant").length;
  const [stats, setStats] = useState({ orders: 0, revenue: 0, avgPrepMinutes: 0 });
  const [hoursOpen, setHoursOpen] = useState("");
  const [hoursClose, setHoursClose] = useState("");
  const [hoursMsg, setHoursMsg] = useState("");

  useEffect(() => {
    const load = () => api<any>("GET", "/merchant/stats?period=today").then(setStats).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  // 0 = Online, 1 = Dine-In, 2 = Offline
  const [storeStatus, setStoreStatus] = useState<StoreStatus>("online");
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Configuration for each status
  const statusConfig = {
    online: {
      index: 0,
      label: "Online",
      color: colors.herb,
      bgColor: colors.herbLight,
      borderColor: colors.herbBorder,
      description: "Accepting delivery, takeaway and dine-in orders.",
    },
    dine_in: {
      index: 1,
      label: "Dine-In",
      color: colors.amberText,
      bgColor: colors.amberTint,
      borderColor: colors.amberBorder,
      description: "Delivery paused. Table orders and reservations only.",
    },
    offline: {
      index: 2,
      label: "Offline",
      color: colors.chiliText,
      bgColor: colors.chiliSoft,
      borderColor: colors.chiliBorder,
      description: "Store closed. Not accepting new orders.",
    },
  };

  // Follow what the server says (also on first load)
  useEffect(() => {
    if (profile) {
      setStoreStatus(profile.storeMode);
      slideAnim.setValue(statusConfig[profile.storeMode].index);
      setHoursOpen((v) => v || profile.hours.open);
      setHoursClose((v) => v || profile.hours.close);
    }
  }, [profile?.storeMode, profile?.hours.open, profile?.hours.close]);

  const saveHours = async () => {
    try {
      await api("PATCH", "/merchant/me", { hours: { open: hoursOpen, close: hoursClose } });
      setHoursMsg("Saved. Customers see you as open or closed based on these hours.");
      refresh();
    } catch (e) {
      setHoursMsg(errorText(e));
    }
  };

  // Switch handler with smooth sliding animation
  const handleStatusChange = (status: StoreStatus) => {
    setStoreStatus(status);
    api("PATCH", "/merchant/me", { storeMode: status }).then(refresh).catch((e) => setHoursMsg(errorText(e)));
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
  const initial = (profile?.name ?? "S").trim().charAt(0).toUpperCase();

  const segLabelColor = (k: StoreStatus) => (storeStatus === k ? statusConfig[k].color : colors.stone);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        {/* ---------- header ---------- */}
        <View style={styles.headerRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Merchant dashboard</Text>
            <Text style={styles.storeName} numberOfLines={1}>{profile?.name ?? ""}</Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={logout} accessibilityLabel="Log out" testID="logout">
            <Ionicons name="log-out-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>

        {/* ---------- today at a glance ---------- */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TODAY</Text>
          <View style={styles.heroStats}>
            <Stat icon="receipt-outline" value={String(stats.orders)} label="Orders" />
            <View style={styles.heroDivider} />
            <Stat icon="cash-outline" value={`RM ${stats.revenue.toFixed(0)}`} label="Revenue" />
            <View style={styles.heroDivider} />
            <Stat icon="timer-outline" value={`${stats.avgPrepMinutes}m`} label="Avg. prep" />
          </View>
        </View>

        {/* ---------- store status ---------- */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Store status</Text>
            <View style={[styles.dot, { backgroundColor: activeMode.color }]} />
          </View>
          <View style={styles.segmentedTrack} onLayout={handleLayout}>
            {trackWidth > 0 && (
              <Animated.View style={[styles.slidingPill, { width: itemWidth, transform: [{ translateX }] }]} />
            )}
            {(["online", "dine_in", "offline"] as StoreStatus[]).map((k) => (
              <Pressable key={k} style={styles.segmentBtn} onPress={() => handleStatusChange(k)} testID={`store-${k}`}>
                <Text style={[styles.segmentLabel, { color: segLabelColor(k) }, storeStatus === k && { fontFamily: fonts.displayBold }]}>{statusConfig[k].label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.statusBanner, { backgroundColor: activeMode.bgColor, borderColor: activeMode.borderColor }]}>
            <Text style={[styles.statusBannerText, { color: activeMode.color }]}>{activeMode.description}</Text>
          </View>
        </View>

        {/* ---------- opening hours ---------- */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Opening hours</Text>
            <Text style={[styles.openPill, { color: profile?.openNow ? colors.herb : colors.chili, backgroundColor: profile?.openNow ? colors.herbLight : colors.chiliSoft }]}>
              {profile?.openNow ? "Open now" : "Closed now"}
            </Text>
          </View>
          <View style={styles.hoursRow}>
            <TextInput style={styles.hoursInput} value={hoursOpen} onChangeText={setHoursOpen} placeholder="09:00" placeholderTextColor={colors.textFaint} testID="hours-open" />
            <Text style={styles.to}>to</Text>
            <TextInput style={styles.hoursInput} value={hoursClose} onChangeText={setHoursClose} placeholder="21:00" placeholderTextColor={colors.textFaint} testID="hours-close" />
            <Pressable style={styles.saveBtn} onPress={saveHours} testID="hours-save">
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>{hoursMsg || "Customers see the open / closed label based on these hours."}</Text>
        </View>

        {/* ---------- manage ---------- */}
        <Text style={styles.section}>Manage</Text>
        <NavRow icon="receipt-outline" tint={colors.turmericDeep} title="Incoming orders" subtitle={`${pendingCount} active order${pendingCount !== 1 ? "s" : ""}`} badge={pendingCount} onPress={() => navigation.navigate("MerchantOrderQueue")} />
        <NavRow icon="calendar-outline" tint={colors.herb} title="Table reservations" subtitle="Bookings, seating and pre-orders" badge={pendingReservations} onPress={() => navigation.navigate("MerchantReservations")} />
        <NavRow icon="restaurant-outline" tint={colors.chili} title="Menu management" subtitle="Dishes, prices, stock and sold-out" onPress={() => navigation.navigate("MerchantMenu")} />
        <NavRow icon="pricetags-outline" tint={colors.ink} title="Promotions & Vouchers" subtitle="Discount codes, limits and cost" onPress={() => navigation.navigate("MerchantVouchers")} />
        <NavRow icon="stats-chart-outline" tint={colors.stoneText} title="Sales reports & analytics" subtitle="Revenue, profit and best sellers" onPress={() => navigation.navigate("MerchantAnalytics")} />
        <NavRow icon="briefcase-outline" tint={colors.amberText} title="Restaurant Job Board" subtitle="Recruit waitstaff, cooks and cashiers" onPress={() => navigation.navigate("MerchantJobBoard")} />
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.turmeric} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: spacing.xxl * 1.5, gap: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontFamily: fonts.displayExtraBold, color: colors.ink },
  hello: { fontSize: 12, fontFamily: fonts.display, color: colors.stone, letterSpacing: 0.3 },
  storeName: { fontSize: 20, fontFamily: fonts.displayExtraBold, color: colors.ink, letterSpacing: -0.3 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },

  hero: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  heroLabel: { fontSize: 11, fontFamily: fonts.displayBold, color: colors.textFaint, letterSpacing: 1.2 },
  heroStats: { flexDirection: "row", alignItems: "center" },
  heroDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.ink },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 22, fontFamily: fonts.displayExtraBold, color: colors.white, letterSpacing: -0.4 },
  statLabel: { fontSize: 11.5, fontFamily: fonts.display, color: colors.textFaint },

  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md, ...shadow.soft },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5 },
  openPill: { fontSize: 11.5, fontFamily: fonts.displayBold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden" },

  segmentedTrack: { position: "relative", flexDirection: "row", backgroundColor: colors.paperDim, borderRadius: radius.pill, padding: 4, height: 44, alignItems: "center" },
  slidingPill: { position: "absolute", top: 4, bottom: 4, left: 4, backgroundColor: colors.white, borderRadius: radius.pill, ...shadow.soft },
  segmentBtn: { flex: 1, alignItems: "center", justifyContent: "center", height: "100%", zIndex: 2 },
  segmentLabel: { fontSize: 13, fontFamily: fonts.display },
  statusBanner: { paddingVertical: 9, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1 },
  statusBannerText: { fontSize: 12.5, fontFamily: fonts.display },

  hoursRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hoursInput: { flex: 1, minWidth: 0, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 9, fontFamily: fonts.serifMedium, fontSize: 14, color: colors.text, textAlign: "center" },
  to: { fontSize: 13, fontFamily: fonts.display, color: colors.stone },
  saveBtn: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  saveText: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.white },
  hint: { fontSize: 12, fontFamily: fonts.serif, color: colors.stone },

  section: { fontSize: 12, fontFamily: fonts.displayBold, color: colors.stone, letterSpacing: 1.1, textTransform: "uppercase", marginTop: spacing.sm, marginBottom: -spacing.xs },
});
