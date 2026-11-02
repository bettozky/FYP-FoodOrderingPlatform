import React from "react";
import { Text, View } from "react-native";
import Avatar from "../shared/components/Avatar";
import { DrawerItem, SideDrawer } from "../shared/components/SideDrawer";
import { colors, spacing, type } from "../shared/theme/theme";
import { useAuth } from "../modules/auth/AuthContext";
import { useLive } from "../modules/orders/LiveDataContext";
import { navRef } from "./navRef";

// The slide-out menu: open it with the ☰ button on the dashboard, or swipe right from the left edge of the dashboard.
const go = (screen: string, params?: object) => () => { if (navRef.isReady()) (navRef as any).navigate(screen, params); };

export default function AppDrawer() {
  const { isLoggedIn, approval, logout } = useAuth();
  const { orders, reservations, profile, badges } = useLive();
  if (!isLoggedIn || approval !== "approved") return null;
  const activeOrders = orders.filter((o) => o.status === "awaiting_merchant" || o.status === "preparing").length;
  const newBookings = reservations.filter((r) => r.status === "awaiting_restaurant").length;

  const items: DrawerItem[] = [
    { key: "dashboard", label: "Dashboard", icon: "home-outline", onPress: go("MerchantDashboard") },
    { key: "orders", label: "Incoming orders", icon: "receipt-outline", onPress: go("MerchantOrderQueue"), badge: activeOrders },
    { key: "reservations", label: "Table reservations", icon: "calendar-outline", onPress: go("MerchantReservations"), badge: newBookings },
    { key: "menu", label: "Menu & dish photos", icon: "restaurant-outline", onPress: go("MerchantMenu") },
    { key: "s1", section: "Hiring" },
    { key: "jobs", label: "Job board", icon: "briefcase-outline", onPress: go("MerchantJobBoard") },
    { key: "applicants", label: "Applicants", icon: "people-outline", onPress: go("MerchantApplicants"), badge: badges.newApplicants },
    { key: "s2", section: "Grow" },
    { key: "announcements", label: "Announcements", icon: "megaphone-outline", onPress: go("MerchantAnnouncements") },
    { key: "vouchers", label: "Promotions & vouchers", icon: "pricetags-outline", onPress: go("MerchantVouchers") },
    { key: "reviews", label: "Customer reviews", icon: "star-outline", onPress: go("MerchantReviews") },
    { key: "analytics", label: "Sales reports", icon: "stats-chart-outline", onPress: go("MerchantAnalytics") },
    { key: "s3", section: "Shop" },
    { key: "shop", label: "Shop profile & photos", icon: "storefront-outline", onPress: go("ShopProfile") },
    { key: "notifications", label: "Notifications", icon: "notifications-outline", onPress: go("MerchantNotifications"), badge: badges.unread },
    { key: "logout", label: "Log out", icon: "log-out-outline", onPress: logout, danger: true },
  ];

  return (
    <SideDrawer
      items={items}
      header={
        <View style={{ gap: spacing.sm }}>
          <Avatar uri={profile?.logo} name={profile?.name} size={56} />
          <Text style={type.h2} numberOfLines={1}>{profile?.name}</Text>
          <Text style={[type.small, { color: colors.stoneText }]}>{profile?.openNow ? "Open now" : "Closed now"}</Text>
        </View>
      }
    />
  );
}
