import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../../../shared/components/Avatar";
import { ListGroup, ListRow } from "../../../shared/components/ListGroup";
import { useAuth } from "../../auth/AuthContext";
import { useLoyalty } from "../../loyalty/useLoyalty";
import { useLive } from "../../ordering/LiveDataContext";
import { colors, font, layout, radius, spacing, type, ui } from "../../../shared/theme/theme";

// Account tab: profile on top, then the same screens as before grouped the iOS way (food, account, more).
// Every row opens a real screen. One icon set (Ionicons) instead of emoji.
type Item = { icon: keyof typeof Ionicons.glyphMap; label: string; go: string };

const FOOD: Item[] = [
  { icon: "heart-outline", label: "Saved dishes", go: "Favourites" },
  { icon: "shield-checkmark-outline", label: "Diet & allergies", go: "Diet" },
  { icon: "star-outline", label: "My reviews", go: "MyReviews" },
  { icon: "wallet-outline", label: "Spending & budget", go: "Spending" },
];
const ACCOUNT: Item[] = [
  { icon: "person-outline", label: "Edit profile & photo", go: "Profile" },
  { icon: "location-outline", label: "Addresses", go: "Addresses" },
  { icon: "card-outline", label: "Payment methods", go: "PaymentMethods" },
  { icon: "notifications-outline", label: "Notifications", go: "Notifications" },
];
const MORE: Item[] = [
  { icon: "briefcase-outline", label: "Jobs", go: "Jobs" },
  { icon: "document-text-outline", label: "My job applications", go: "MyApplications" },
  { icon: "megaphone-outline", label: "Announcements", go: "Announcements" },
  { icon: "help-circle-outline", label: "Help & support", go: "Help" },
];

export default function AccountScreen({ navigation }: any) {
  const { name, user, logout } = useAuth();
  const loyalty = useLoyalty();
  const unread = useLive().notifications.length;
  const insets = useSafeAreaInsets();

  const row = (m: Item, extra?: Partial<React.ComponentProps<typeof ListRow>>) => (
    <ListRow key={m.go} icon={m.icon} label={m.label} onPress={() => navigation.navigate(m.go)} testID={`account-${m.go}`} {...extra} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: layout.tabBarClearance }}>
        <Text style={[type.h1, styles.title]} accessibilityRole="header">Account</Text>

        <Pressable
          style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate("Profile")}
          accessibilityRole="button"
          accessibilityLabel={`${name || "Student"}, ${user?.email ?? ""}. Edit profile`}
        >
          <Avatar uri={user?.avatar} name={name} size={60} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[type.h2, { fontSize: 20 }]} numberOfLines={1}>{name || "Student"}</Text>
            <Text style={type.bodyMuted} numberOfLines={1}>{user?.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.stoneSoft} />
        </Pressable>

        {/* Loyalty: points are a number people check, so they get their own tile. */}
        <Pressable
          style={({ pressed }) => [styles.points, pressed && { opacity: 0.9 }]}
          onPress={() => navigation.navigate("Loyalty")}
          accessibilityRole="button"
          accessibilityLabel={`Loyalty and vouchers. ${loyalty.tier} member, ${loyalty.points} points`}
          testID="account-Loyalty"
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.pointsLabel}>{loyalty.tier} member</Text>
            <Text style={styles.pointsValue}>{loyalty.points.toLocaleString()} <Text style={styles.pointsUnit}>pts</Text></Text>
          </View>
          <View style={styles.pointsCta}>
            <Ionicons name="gift-outline" size={16} color={colors.ink} />
            <Text style={styles.pointsCtaText}>Rewards</Text>
          </View>
        </Pressable>

        <ListGroup title="Food">{FOOD.map((m) => row(m))}</ListGroup>
        <ListGroup title="Account">{ACCOUNT.map((m) => row(m, m.go === "Notifications" && unread ? { badge: unread } : undefined))}</ListGroup>
        <ListGroup title="More">{MORE.map((m) => row(m))}</ListGroup>

        <ListGroup>
          <ListRow icon="log-out-outline" label="Log out" tone="danger" chevron={false} onPress={logout} testID="logout" />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: layout.gutter, marginBottom: spacing.lg },
  profileCard: { ...ui.group, flexDirection: "row", alignItems: "center", gap: spacing.lg, marginHorizontal: layout.gutter, padding: spacing.lg },
  points: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: layout.gutter, marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.ink },
  pointsLabel: { ...font.display, fontSize: 14, color: colors.stoneSoft },
  pointsValue: { ...font.displayExtraBold, fontSize: 28, color: colors.white, letterSpacing: -0.5, marginTop: 2, fontVariant: ["tabular-nums"] },
  pointsUnit: { ...font.displayBold, fontSize: 16, color: colors.turmeric, letterSpacing: 0 },
  pointsCta: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.paper },
  pointsCtaText: { ...font.displayBold, fontSize: 14, color: colors.ink },
});
