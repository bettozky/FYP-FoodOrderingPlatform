import React from "react";
import { Text, View } from "react-native";
import Avatar from "../shared/components/Avatar";
import { DrawerItem, SideDrawer } from "../shared/components/SideDrawer";
import { colors, spacing, type } from "../shared/theme/theme";
import { useAuth } from "../modules/auth/AuthContext";
import { useLive } from "../modules/ordering/LiveDataContext";
import { navRef } from "./navRef";

// The slide-out menu (open it with the ☰ button on Home, or swipe from the left edge of Home).
const nav = (screen: string, params?: object) => { if (navRef.isReady()) (navRef as any).navigate(screen, params); };
const go = (screen: string, params?: object) => () => nav(screen, params);
const tab = (key: string) => () => nav("MainTabs", { tab: key, nonce: Date.now() });

export default function AppDrawer() {
  const { isLoggedIn, user, logout } = useAuth();
  const { notifications } = useLive();
  if (!isLoggedIn) return null;

  const items: DrawerItem[] = [
    { key: "home", label: "Home", icon: "home-outline", onPress: tab("home") },
    { key: "orders", label: "My orders", icon: "receipt-outline", onPress: tab("orders") },
    { key: "tables", label: "Table bookings", icon: "calendar-outline", onPress: tab("book") },
    { key: "s1", section: "Discover" },
    { key: "announcements", label: "Announcements", icon: "megaphone-outline", onPress: go("Announcements") },
    { key: "jobs", label: "Jobs near campus", icon: "briefcase-outline", onPress: go("Jobs") },
    { key: "applications", label: "My job applications", icon: "document-text-outline", onPress: go("MyApplications") },
    { key: "s2", section: "Your stuff" },
    { key: "notifications", label: "Notifications", icon: "notifications-outline", onPress: go("Notifications"), badge: notifications.length },
    { key: "saved", label: "Saved dishes & stalls", icon: "heart-outline", onPress: go("Favourites") },
    { key: "reviews", label: "My reviews", icon: "star-outline", onPress: go("MyReviews") },
    { key: "loyalty", label: "Loyalty & vouchers", icon: "gift-outline", onPress: go("Loyalty") },
    { key: "addresses", label: "Addresses", icon: "location-outline", onPress: go("Addresses") },
    { key: "s3", section: "Account" },
    { key: "profile", label: "Edit profile & photo", icon: "person-outline", onPress: go("Profile") },
    { key: "help", label: "Help & support", icon: "help-circle-outline", onPress: go("Help") },
    { key: "logout", label: "Log out", icon: "log-out-outline", onPress: logout, danger: true },
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
