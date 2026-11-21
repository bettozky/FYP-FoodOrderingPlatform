import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Avatar from "../../../shared/components/Avatar";
import LanguagePicker from "../../../shared/i18n/LanguagePicker";
import { tierName } from "../../../shared/i18n/labels";
import { useAuth } from "../../auth/AuthContext";
import { useLoyalty } from "../../loyalty/useLoyalty";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";

// Every row opens a real screen. One icon set (Ionicons) instead of emoji. `label` is a translation key.
const menuItems = [
  { icon: "person-outline", label: "menu.editProfile", go: "Profile" },
  { icon: "document-text-outline", label: "menu.myApplications", go: "MyApplications" },
  { icon: "megaphone-outline", label: "menu.announcements", go: "Announcements" },
  { icon: "wallet-outline", label: "menu.spending", go: "Spending" },
  { icon: "gift-outline", label: "menu.loyalty", go: "Loyalty" },
  { icon: "star-outline", label: "menu.myReviews", go: "MyReviews" },
  { icon: "heart-outline", label: "menu.savedDishes", go: "Favourites" },
  { icon: "location-outline", label: "menu.addresses", go: "Addresses" },
  { icon: "briefcase-outline", label: "menu.jobs", go: "Jobs" },
  { icon: "card-outline", label: "menu.paymentMethods", go: "PaymentMethods" },
  { icon: "notifications-outline", label: "menu.notifications", go: "Notifications" },
  { icon: "help-circle-outline", label: "menu.help", go: "Help" },
] as const satisfies readonly { icon: keyof typeof Ionicons.glyphMap; label: string; go: string }[];

export default function AccountScreen({ navigation }: any) {
  const { name, user, logout } = useAuth();
  const { t } = useTranslation();
  const loyalty = useLoyalty();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.profileCard}>
          <Pressable onPress={() => navigation.navigate("Profile")} accessibilityRole="button" accessibilityLabel={t("account.editPhoto")}><Avatar uri={user?.avatar} name={name} size={52} /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{name || t("account.student")}</Text>
            <Text style={type.bodyMuted}>{user?.email}</Text>
            <Text style={type.small}>{t("account.member", { tier: tierName(loyalty.tier), points: loyalty.points })}</Text>
          </View>
        </View>

        <View style={styles.section}>
          {menuItems.map((m) => (
            <Pressable
              key={m.go}
              style={styles.menuRow}
              onPress={() => navigation.navigate(m.go)}
              accessibilityRole="button"
              accessibilityLabel={t(m.label)}
              testID={`account-${m.go}`}
            >
              <Ionicons name={m.icon} size={20} color={colors.ink} />
              <Text style={[type.body, { flex: 1 }]}>{t(m.label)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.stone} />
            </Pressable>
          ))}
        </View>

        {/* App language: English / Bahasa Melayu / 中文 (saved on the account) */}
        <View style={styles.langHead}>
          <Ionicons name="language-outline" size={20} color={colors.ink} />
          <Text style={styles.sectionTitle}>{t("language.title")}</Text>
        </View>
        <LanguagePicker />
        <Text style={[type.small, { marginTop: spacing.sm }]}>{t("language.note")}</Text>

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>{t("menu.logout")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 140 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontFamily: fonts.displayExtraBold, color: colors.primaryDark },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
  logoutBtn: { marginTop: spacing.xl, alignItems: "center", paddingVertical: spacing.md },
  logoutText: { color: colors.danger, fontFamily: fonts.displayBold },
});
