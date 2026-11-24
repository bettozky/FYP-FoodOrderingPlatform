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
import NavRow, { NavGroup } from "../../../shared/components/NavRow";
import Avatar from "../../../shared/components/Avatar";
import { DrawerEdge, MenuButton } from "../../../shared/components/SideDrawer";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, type, shadow, font, layout, ui } from "../../../shared/theme/theme";
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
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.hello} numberOfLines={1}>{t("dash.title")}</Text>
            <Text style={styles.storeName} numberOfLines={1}>{profile?.name ?? ""}</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]} onPress={logout} hitSlop={4} accessibilityRole="button" accessibilityLabel={t("drawer.logout")} testID="logout">
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
        <Pressable style={({ pressed }) => [styles.ratingCard, pressed && { opacity: 0.85 }]} onPress={() => navigation.navigate("MerchantReviews")} accessibilityRole="button" accessibilityLabel={t("drawer.reviews")} testID="rating-card">
          <Ionicons name="star" size={26} color={colors.turmeric} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{rating?.average ? `${rating.average.toFixed(1)} / 5` : t("dash.noRatings")}</Text>
            <Text style={styles.hint}>{rating ? `${t("dash.reviews", { count: rating.count })}${rating.unanswered ? ` · ${t("dash.unanswered", { count: rating.unanswered })}` : ""}` : `${t("common.loading")}…`}</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.stoneSoft} />
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
              <Pressable key={k} style={styles.segmentBtn} onPress={() => handleStatusChange(k)} accessibilityRole="tab" accessibilityState={{ selected: storeStatus === k }} testID={`store-${k}`}>
                <Text style={[styles.segmentLabel, { color: segLabelColor(k) }, storeStatus === k && { ...font.displayBold }]}>{statusConfig[k].label}</Text>
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

        {/* ---------- manage: the same screens, grouped the iOS way ---------- */}
        <View style={styles.groups}>
          <NavGroup title={t("dash.groupOrders")}>
            <NavRow icon="receipt-outline" title={t("drawer.orders")} subtitle={t("dash.activeOrders", { count: pendingCount })} badge={pendingCount} onPress={() => navigation.navigate("MerchantOrderQueue")} />
            <NavRow icon="calendar-outline" title={t("drawer.reservations")} subtitle={t("dash.reservationsHint")} badge={pendingReservations} onPress={() => navigation.navigate("MerchantReservations")} />
          </NavGroup>
          <NavGroup title={t("dash.groupShop")}>
            <NavRow icon="restaurant-outline" title={t("dash.menu")} subtitle={t("dash.menuHint")} onPress={() => navigation.navigate("MerchantMenu")} />
            <NavRow icon="pricetags-outline" title={t("drawer.vouchers")} subtitle={t("dash.vouchersHint")} onPress={() => navigation.navigate("MerchantVouchers")} />
            <NavRow icon="megaphone-outline" title={t("drawer.announcements")} subtitle={t("dash.announcementsHint")} onPress={() => navigation.navigate("MerchantAnnouncements")} />
            <NavRow icon="storefront-outline" title={t("drawer.shopProfile")} subtitle={t("dash.shopHint")} onPress={() => navigation.navigate("ShopProfile")} />
          </NavGroup>
          <NavGroup title={t("dash.groupInsights")}>
            <NavRow icon="stats-chart-outline" title={t("dash.analytics")} subtitle={t("dash.analyticsHint")} onPress={() => navigation.navigate("MerchantAnalytics")} />
            <NavRow icon="analytics-outline" title={t("drawer.forecast")} subtitle={t("dash.forecastHint")} onPress={() => navigation.navigate("MerchantForecast")} />
            <NavRow icon="star-outline" title={t("drawer.reviews")} subtitle={t("dash.reviewsHint")} onPress={() => navigation.navigate("MerchantReviews")} />
          </NavGroup>
          <NavGroup title={t("dash.groupHiring")}>
            <NavRow icon="briefcase-outline" title={t("dash.jobs")} subtitle={t("dash.jobsHint")} onPress={() => navigation.navigate("MerchantJobBoard")} />
            <NavRow icon="people-outline" title={t("drawer.applicants")} subtitle={t("dash.applicantsHint")} badge={badges.newApplicants} onPress={() => navigation.navigate("MerchantApplicants")} />
          </NavGroup>
        </View>
      </ScrollView>
      <DrawerEdge top={insets.top + 70} bottom={0} />
    </View>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.turmeric} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingVertical: spacing.md, paddingBottom: spacing.xxl * 1.5, gap: spacing.md, width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xs },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, ...font.displayExtraBold, color: colors.ink },
  hello: { fontSize: 13, ...font.display, color: colors.stoneText },
  storeName: { fontSize: 22, ...font.displayExtraBold, color: colors.ink, letterSpacing: -0.4 },
  iconBtn: { ...ui.iconButton },

  // Today's numbers on an ink card: the merchant app's signature surface.
  hero: { ...ui.cardDark, padding: spacing.xl, gap: spacing.lg },
  heroLabel: { fontSize: 15, ...font.displayBold, color: colors.stoneSoft },
  heroStats: { flexDirection: "row", alignItems: "center" },
  heroDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.18)" },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 26, ...font.displayExtraBold, color: colors.white, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 13, ...font.display, color: colors.stoneSoft },

  card: { ...ui.card, padding: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 17, ...font.displayBold, color: colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5 },

  // iOS segmented control with a sliding white pill.
  segmentedTrack: { position: "relative", flexDirection: "row", backgroundColor: colors.paperDim, borderRadius: 12, padding: 3, height: 42, alignItems: "center" },
  slidingPill: { position: "absolute", top: 3, bottom: 3, left: 3, backgroundColor: colors.white, borderRadius: 9, ...shadow.soft },
  segmentBtn: { flex: 1, alignItems: "center", justifyContent: "center", height: "100%", zIndex: 2 },
  segmentLabel: { fontSize: 14, ...font.display },
  statusBanner: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1 },
  statusBannerText: { fontSize: 14, ...font.display },

  hint: { fontSize: 14, ...font.serif, color: colors.stoneText },

  ratingCard: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  groups: { gap: spacing.xl, marginTop: spacing.md },
});
