import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Avatar from "../../../shared/components/Avatar";
import { ListGroup, ListRow } from "../../../shared/components/ListGroup";
import LanguagePicker from "../../../shared/i18n/LanguagePicker";
import { tierName } from "../../../shared/i18n/labels";
import { useAuth } from "../../auth/AuthContext";
import { useLoyalty } from "../../loyalty/useLoyalty";
import { useLive } from "../../ordering/LiveDataContext";
import { colors, font, layout, radius, spacing, type, ui } from "../../../shared/theme/theme";

// Account tab: profile on top, then the same screens as before grouped the iOS way (food, account, more).
// Every row opens a real screen. One icon set (Ionicons) instead of emoji. `label` is a translation key.
type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; go: string };

const FOOD = [
  { icon: "heart-outline", label: "menu.savedDishes", go: "Favourites" },
  { icon: "shield-checkmark-outline", label: "menu.dietAllergies", go: "Diet" },
  { icon: "star-outline", label: "menu.myReviews", go: "MyReviews" },
  { icon: "wallet-outline", label: "menu.spending", go: "Spending" },
] as const satisfies readonly Row[];
const ACCOUNT = [
  { icon: "person-outline", label: "menu.editProfile", go: "Profile" },
  { icon: "location-outline", label: "menu.addresses", go: "Addresses" },
  { icon: "card-outline", label: "menu.paymentMethods", go: "PaymentMethods" },
  { icon: "notifications-outline", label: "menu.notifications", go: "Notifications" },
] as const satisfies readonly Row[];
const MORE = [
  { icon: "briefcase-outline", label: "menu.jobs", go: "Jobs" },
  { icon: "document-text-outline", label: "menu.myApplications", go: "MyApplications" },
  { icon: "megaphone-outline", label: "menu.announcements", go: "Announcements" },
  { icon: "help-circle-outline", label: "menu.help", go: "Help" },
] as const satisfies readonly Row[];
type Item = (typeof FOOD | typeof ACCOUNT | typeof MORE)[number];

export default function AccountScreen({ navigation }: any) {
  const { name, user, logout } = useAuth();
  const { t } = useTranslation();
  const loyalty = useLoyalty();
  const unread = useLive().notifications.length;
  const insets = useSafeAreaInsets();

  const row = (m: Item, extra?: Partial<React.ComponentProps<typeof ListRow>>) => (
    <ListRow key={m.go} icon={m.icon} label={t(m.label)} onPress={() => navigation.navigate(m.go)} testID={`account-${m.go}`} {...extra} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: layout.tabBarClearance }}>
        <Text style={[type.h1, styles.title]} accessibilityRole="header">{t("tabs.account")}</Text>

        <Pressable
          style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate("Profile")}
          accessibilityRole="button"
          accessibilityLabel={t("account.editProfileLabel", { name: name || t("account.student"), email: user?.email ?? "" })}
        >
          <Avatar uri={user?.avatar} name={name} size={60} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[type.h2, { fontSize: 20 }]} numberOfLines={1}>{name || t("account.student")}</Text>
            <Text style={type.bodyMuted} numberOfLines={1}>{user?.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.stoneSoft} />
        </Pressable>

        {/* Loyalty: points are a number people check, so they get their own tile. */}
        <Pressable
          style={({ pressed }) => [styles.points, pressed && { opacity: 0.9 }]}
          onPress={() => navigation.navigate("Loyalty")}
          accessibilityRole="button"
          accessibilityLabel={`${t("menu.loyalty")}. ${t("account.member", { tier: tierName(loyalty.tier), points: loyalty.points })}`}
          testID="account-Loyalty"
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.pointsLabel}>{t("loyalty.member", { tier: tierName(loyalty.tier) })}</Text>
            <Text style={styles.pointsValue}>{loyalty.points.toLocaleString()} <Text style={styles.pointsUnit}>{t("loyalty.ptsUnit")}</Text></Text>
          </View>
          <View style={styles.pointsCta}>
            <Ionicons name="gift-outline" size={16} color={colors.ink} />
            <Text style={styles.pointsCtaText}>{t("account.rewards")}</Text>
          </View>
        </Pressable>

        <ListGroup title={t("account.groupFood")}>{FOOD.map((m) => row(m))}</ListGroup>
        <ListGroup title={t("tabs.account")}>{ACCOUNT.map((m) => row(m, m.go === "Notifications" && unread ? { badge: unread } : undefined))}</ListGroup>
        <ListGroup title={t("account.groupMore")}>{MORE.map((m) => row(m))}</ListGroup>

        {/* App language: English / Bahasa Melayu / 中文 (saved on the account) */}
        <View style={styles.langBlock}>
          <View style={styles.langHead}>
            <Ionicons name="language-outline" size={18} color={colors.ink} />
            <Text style={styles.sectionTitle}>{t("language.title")}</Text>
          </View>
          <LanguagePicker />
          <Text style={[type.small, { marginTop: spacing.sm }]}>{t("language.note")}</Text>
        </View>

        <ListGroup>
          <ListRow icon="log-out-outline" label={t("menu.logout")} tone="danger" chevron={false} onPress={logout} testID="logout" />
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
  langBlock: { marginHorizontal: layout.gutter, marginTop: layout.section },
  langHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...font.displayBold, fontSize: 15, color: colors.ink },
});
