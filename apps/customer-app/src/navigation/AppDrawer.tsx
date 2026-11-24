import React from "react";
import { Text, View } from "react-native";
import Avatar from "../shared/components/Avatar";
import { DrawerItem, SideDrawer } from "../shared/components/SideDrawer";
import { colors, spacing, type } from "../shared/theme/theme";
import { useAuth } from "../modules/auth/AuthContext";
import { useLive } from "../modules/ordering/LiveDataContext";
import { navRef } from "./navRef";
import { useTranslation } from "react-i18next";

// The slide-out menu (open it with the ☰ button on Home, or swipe from the left edge of Home).
const nav = (screen: string, params?: object) => { if (navRef.isReady()) (navRef as any).navigate(screen, params); };
const go = (screen: string, params?: object) => () => nav(screen, params);
const tab = (key: string) => () => nav("MainTabs", { tab: key, nonce: Date.now() });

export default function AppDrawer() {
  const { isLoggedIn, user, logout } = useAuth();
  const { notifications } = useLive();
  const { t } = useTranslation();
  if (!isLoggedIn) return null;

  const items: DrawerItem[] = [
    { key: "home", label: t("tabs.home"), icon: "home-outline", onPress: tab("home") },
    { key: "orders", label: t("menu.myOrders"), icon: "receipt-outline", onPress: tab("orders") },
    { key: "tables", label: t("menu.tableBookings"), icon: "calendar-outline", onPress: tab("book") },
    { key: "s1", section: t("menu.discover") },
    { key: "announcements", label: t("menu.announcements"), icon: "megaphone-outline", onPress: go("Announcements") },
    { key: "jobs", label: t("menu.jobsNearCampus"), icon: "briefcase-outline", onPress: go("Jobs") },
    { key: "applications", label: t("menu.myApplications"), icon: "document-text-outline", onPress: go("MyApplications") },
    { key: "s2", section: t("menu.yourStuff") },
    { key: "notifications", label: t("menu.notifications"), icon: "notifications-outline", onPress: go("Notifications"), badge: notifications.length },
    { key: "saved", label: t("menu.savedDishesStalls"), icon: "heart-outline", onPress: go("Favourites") },
    { key: "reviews", label: t("menu.myReviews"), icon: "star-outline", onPress: go("MyReviews") },
    { key: "loyalty", label: t("menu.loyalty"), icon: "gift-outline", onPress: go("Loyalty") },
    { key: "addresses", label: t("menu.addresses"), icon: "location-outline", onPress: go("Addresses") },
    { key: "s3", section: t("tabs.account") },
    { key: "profile", label: t("menu.editProfile"), icon: "person-outline", onPress: go("Profile") },
    { key: "help", label: t("menu.help"), icon: "help-circle-outline", onPress: go("Help") },
    { key: "logout", label: t("menu.logout"), icon: "log-out-outline", onPress: logout, danger: true },
  ];

  return (
    <SideDrawer
      items={items}
      header={
        <View style={{ gap: spacing.sm }}>
          <Avatar uri={user?.avatar} name={user?.name} size={56} />
          <Text style={type.h2} numberOfLines={1}>{user?.name}</Text>
          <Text style={[type.small, { color: colors.stoneText }]} numberOfLines={1}>{user?.email}</Text>
        </View>
      }
    />
  );
}
