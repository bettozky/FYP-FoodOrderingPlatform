import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { api, errorText } from "../../../shared/api/client";
import OpeningHoursCard from "../components/OpeningHoursCard";
import BusyModeCard from "../components/BusyModeCard";
import { useLive } from "../../orders/LiveDataContext";
import { useAuth } from "../../auth/AuthContext";
import NavRow from "../../../shared/components/NavRow";
import Avatar from "../../../shared/components/Avatar";
import { DrawerEdge, MenuButton } from "../../../shared/components/SideDrawer";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, type, fonts, shadow } from "../../../shared/theme/theme";
import { useTranslation } from "react-i18next";

type StoreStatus = "online" | "dine_in" | "offline";

export default function MerchantDashboardScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets(); // keeps the header clear of the clock / battery / notch
  const { orders, reservations, profile, badges, refresh } = useLive();
  const pendingCount = orders.filter((o) => o.status === "awaiting_merchant" || o.status === "preparing").length;
  const pendingReservations = reservations.filter((r) => r.status === "awaiting_restaurant").length;
  const [stats, setStats] = useState({ orders: 0, revenue: 0, avgPrepMinutes: 0 });
  const [statusMsg, setStatusMsg] = useState("");
  const [rating, setRating] = useState<{ average: number | null; count: number; unanswered: number } | null>(null);

  useEffect(() => {
    const load = () => api<any>("GET", "/merchant/stats?period=today").then(setStats).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  // The shop's rating, from the customer reviews
  useEffect(() => {
    const load = () => api<any>("GET", "/merchant/reviews?limit=1").then((r) => setRating({ average: r.average, count: r.count, unanswered: r.unanswered })).catch(() => {});
    load();
    const t = setInterval(load, 30000);
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
      label: t("store.online"),
      color: colors.herb,
      bgColor: colors.herbLight,
      borderColor: colors.herbBorder,
      description: t("store.onlineHint"),
    },
    dine_in: {
      index: 1,
      label: t("store.dineIn"),
      color: colors.amberText,
      bgColor: colors.amberTint,
      borderColor: colors.amberBorder,
      description: t("store.dineInHint"),
    },
    offline: {
      index: 2,
      label: t("store.offline"),
      color: colors.chiliText,
      bgColor: colors.chiliSoft,
      borderColor: colors.chiliBorder,
      description: t("store.offlineHint"),
    },
  };

  // Follow what the server says (also on first load)
  useEffect(() => {
    if (profile) {
      setStoreStatus(profile.storeMode);
      slideAnim.setValue(statusConfig[profile.storeMode].index);
    }
  }, [profile?.storeMode]);

  // Switch handler with smooth sliding animation
  const handleStatusChange = (status: StoreStatus) => {
    setStoreStatus(status);
    setStatusMsg("");
    api("PATCH", "/merchant/me", { storeMode: status }).then(refresh).catch((e) => setStatusMsg(errorText(e)));
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

  const segLabelColor = (k: StoreStatus) => (storeStatus === k ? statusConfig[k].color : colors.stone);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing.md }]} showsVerticalScrollIndicator={false}>
        {/* ---------- header ---------- */}
        <View style={styles.headerRow}>
          <MenuButton badge={badges.unread + badges.newApplicants} />
          <Avatar uri={profile?.logo} name={profile?.name} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{t("dash.title")}</Text>
            <Text style={styles.storeName} numberOfLines={1}>{profile?.name ?? ""}</Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={logout} accessibilityLabel={t("drawer.logout")} testID="logout">
            <Ionicons name="log-out-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>

        {/* ---------- today at a glance ---------- */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t("dash.today")}</Text>
          <View style={styles.heroStats}>
            <Stat icon="receipt-outline" value={String(stats.orders)} label={t("dash.orders")} />
            <View style={styles.heroDivider} />
            <Stat icon="cash-outline" value={`RM ${stats.revenue.toFixed(0)}`} label={t("dash.revenue")} />
            <View style={styles.heroDivider} />
            <Stat icon="timer-outline" value={t("dash.minutes", { n: stats.avgPrepMinutes })} label={t("dash.avgPrep")} />
          </View>
        </View>

        {/* ---------- rating ---------- */}
        <Pressable style={styles.ratingCard} onPress={() => navigation.navigate("MerchantReviews")} accessibilityRole="button" accessibilityLabel={t("drawer.reviews")} testID="rating-card">
          <Ionicons name="star" size={26} color={colors.turmeric} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{rating?.average ? `${rating.average.toFixed(1)} / 5` : t("dash.noRatings")}</Text>
            <Text style={styles.hint}>{rating ? `${t("dash.reviews", { count: rating.count })}${rating.unanswered ? ` · ${t("dash.unanswered", { count: rating.unanswered })}` : ""}` : `${t("common.loading")}…`}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>

        {/* ---------- store status ---------- */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{t("store.title")}</Text>
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
          {statusMsg ? <Text style={[styles.hint, { color: colors.chiliText }]}>{statusMsg}</Text> : null}
        </View>

        {/* ---------- opening hours (per day, folded by default) ---------- */}
        <OpeningHoursCard profile={profile} onSaved={refresh} />

        {/* ---------- Sprint 3: busy mode / auto-pause ---------- */}
        <BusyModeCard />

        {/* ---------- manage ---------- */}
        <Text style={styles.section}>{t("dash.manage")}</Text>
        <NavRow icon="receipt-outline" tint={colors.turmericDeep} title={t("drawer.orders")} subtitle={t("dash.activeOrders", { count: pendingCount })} badge={pendingCount} onPress={() => navigation.navigate("MerchantOrderQueue")} />
        <NavRow icon="calendar-outline" tint={colors.herb} title={t("drawer.reservations")} subtitle={t("dash.reservationsHint")} badge={pendingReservations} onPress={() => navigation.navigate("MerchantReservations")} />
        <NavRow icon="restaurant-outline" tint={colors.chili} title={t("dash.menu")} subtitle={t("dash.menuHint")} onPress={() => navigation.navigate("MerchantMenu")} />
        <NavRow icon="pricetags-outline" tint={colors.ink} title={t("drawer.vouchers")} subtitle={t("dash.vouchersHint")} onPress={() => navigation.navigate("MerchantVouchers")} />
        <NavRow icon="stats-chart-outline" tint={colors.stoneText} title={t("dash.analytics")} subtitle={t("dash.analyticsHint")} onPress={() => navigation.navigate("MerchantAnalytics")} />
        <NavRow icon="analytics-outline" tint={colors.herb} title={t("drawer.forecast")} subtitle={t("dash.forecastHint")} onPress={() => navigation.navigate("MerchantForecast")} />
        <NavRow icon="star-outline" tint={colors.turmericDeep} title={t("drawer.reviews")} subtitle={t("dash.reviewsHint")} onPress={() => navigation.navigate("MerchantReviews")} />
        <NavRow icon="briefcase-outline" tint={colors.amberText} title={t("dash.jobs")} subtitle={t("dash.jobsHint")} onPress={() => navigation.navigate("MerchantJobBoard")} />
        <NavRow icon="people-outline" tint={colors.herb} title={t("drawer.applicants")} subtitle={t("dash.applicantsHint")} badge={badges.newApplicants} onPress={() => navigation.navigate("MerchantApplicants")} />
        <NavRow icon="megaphone-outline" tint={colors.chili} title={t("drawer.announcements")} subtitle={t("dash.announcementsHint")} onPress={() => navigation.navigate("MerchantAnnouncements")} />
        <NavRow icon="storefront-outline" tint={colors.ink} title={t("drawer.shopProfile")} subtitle={t("dash.shopHint")} onPress={() => navigation.navigate("ShopProfile")} />
      </ScrollView>
      <DrawerEdge top={insets.top + 70} bottom={0} />
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

  segmentedTrack: { position: "relative", flexDirection: "row", backgroundColor: colors.paperDim, borderRadius: radius.pill, padding: 4, height: 44, alignItems: "center" },
  slidingPill: { position: "absolute", top: 4, bottom: 4, left: 4, backgroundColor: colors.white, borderRadius: radius.pill, ...shadow.soft },
  segmentBtn: { flex: 1, alignItems: "center", justifyContent: "center", height: "100%", zIndex: 2 },
  segmentLabel: { fontSize: 13, fontFamily: fonts.display },
  statusBanner: { paddingVertical: 9, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1 },
  statusBannerText: { fontSize: 12.5, fontFamily: fonts.display },

  hint: { fontSize: 12, fontFamily: fonts.serif, color: colors.stone },

  ratingCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  section: { fontSize: 12, fontFamily: fonts.displayBold, color: colors.stone, letterSpacing: 1.1, textTransform: "uppercase", marginTop: spacing.sm, marginBottom: -spacing.xs },
});
