import React from "react";
import { Text, View } from "react-native";
import Avatar from "../shared/components/Avatar";
import { DrawerItem, SideDrawer } from "../shared/components/SideDrawer";
import { colors, spacing, type } from "../shared/theme/theme";
import { useAuth } from "../modules/auth/AuthContext";
import { useLive } from "../modules/orders/LiveDataContext";
import { navRef } from "./navRef";
import LanguagePicker from "../shared/i18n/LanguagePicker";
import { useTranslation } from "react-i18next";

// The slide-out menu: open it with the ☰ button on the dashboard, or swipe right from the left edge of the dashboard.
const go = (screen: string, params?: object) => () => { if (navRef.isReady()) (navRef as any).navigate(screen, params); };

export default function AppDrawer() {
  const { isLoggedIn, approval, logout } = useAuth();
  const { t } = useTranslation();
  const { orders, reservations, profile, badges } = useLive();
  if (!isLoggedIn || approval !== "approved") return null;
  const activeOrders = orders.filter((o) => o.status === "awaiting_merchant" || o.status === "preparing").length;
  const newBookings = reservations.filter((r) => r.status === "awaiting_restaurant").length;

  const items: DrawerItem[] = [
    { key: "dashboard", label: t("drawer.dashboard"), icon: "home-outline", onPress: go("MerchantDashboard") },
    { key: "orders", label: t("drawer.orders"), icon: "receipt-outline", onPress: go("MerchantOrderQueue"), badge: activeOrders },
    { key: "reservations", label: t("drawer.reservations"), icon: "calendar-outline", onPress: go("MerchantReservations"), badge: newBookings },
    { key: "menu", label: t("drawer.menuPhotos"), icon: "restaurant-outline", onPress: go("MerchantMenu") },
    { key: "s1", section: t("drawer.hiring") },
    { key: "jobs", label: t("drawer.jobs"), icon: "briefcase-outline", onPress: go("MerchantJobBoard") },
    { key: "applicants", label: t("drawer.applicants"), icon: "people-outline", onPress: go("MerchantApplicants"), badge: badges.newApplicants },
    { key: "s2", section: t("drawer.grow") },
    { key: "announcements", label: t("drawer.announcements"), icon: "megaphone-outline", onPress: go("MerchantAnnouncements") },
    { key: "vouchers", label: t("drawer.vouchers"), icon: "pricetags-outline", onPress: go("MerchantVouchers") },
    { key: "reviews", label: t("drawer.reviews"), icon: "star-outline", onPress: go("MerchantReviews") },
    { key: "analytics", label: t("drawer.analytics"), icon: "stats-chart-outline", onPress: go("MerchantAnalytics") },
    { key: "forecast", label: t("drawer.forecast"), icon: "analytics-outline", onPress: go("MerchantForecast") },
    { key: "s3", section: t("drawer.shop") },
    { key: "shop", label: t("drawer.shopProfile"), icon: "storefront-outline", onPress: go("ShopProfile") },
    { key: "notifications", label: t("drawer.notifications"), icon: "notifications-outline", onPress: go("MerchantNotifications"), badge: badges.unread },
    { key: "logout", label: t("drawer.logout"), icon: "log-out-outline", onPress: logout, danger: true },
  ];

  return (
    <SideDrawer
      items={items}
      header={
        <View style={{ gap: spacing.sm }}>
          <Avatar uri={profile?.logo} name={profile?.name} size={56} />
          <Text style={type.h2} numberOfLines={1}>{profile?.name}</Text>
          <Text style={[type.small, { color: colors.stoneText }]}>{profile?.openNow ? t("drawer.openNow") : t("drawer.closedNow")}</Text>
          <LanguagePicker style={{ marginTop: spacing.xs }} />
        </View>
      }
    />
  );
}
