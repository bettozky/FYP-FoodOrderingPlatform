import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { useLoyalty } from "../../loyalty/useLoyalty";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";

// Every row opens a real screen. One icon set (Ionicons) instead of emoji.
const menuItems: { icon: keyof typeof Ionicons.glyphMap; label: string; go: string }[] = [
  { icon: "gift-outline", label: "Loyalty & vouchers", go: "Loyalty" },
  { icon: "heart-outline", label: "Saved dishes", go: "Favourites" },
  { icon: "location-outline", label: "Addresses", go: "Addresses" },
  { icon: "briefcase-outline", label: "Jobs", go: "Jobs" },
  { icon: "card-outline", label: "Payment methods", go: "PaymentMethods" },
  { icon: "notifications-outline", label: "Notifications", go: "Notifications" },
  { icon: "help-circle-outline", label: "Help & support", go: "Help" },
];

export default function AccountScreen({ navigation }: any) {
  const { name, user, logout } = useAuth();
  const loyalty = useLoyalty();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name || "S")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{name || "Student"}</Text>
            <Text style={type.bodyMuted}>{user?.email}</Text>
            <Text style={type.small}>{loyalty.tier} member · {loyalty.points} pts</Text>
          </View>
        </View>

        <View style={styles.section}>
          {menuItems.map((m) => (
            <Pressable
              key={m.label}
              style={styles.menuRow}
              onPress={() => navigation.navigate(m.go)}
              accessibilityRole="button"
              accessibilityLabel={m.label}
              testID={`account-${m.go}`}
            >
              <Ionicons name={m.icon} size={20} color={colors.ink} />
              <Text style={[type.body, { flex: 1 }]}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.stone} />
            </Pressable>
          ))}
        </View>


        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
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
  logoutBtn: { marginTop: spacing.xl, alignItems: "center", paddingVertical: spacing.md },
  logoutText: { color: colors.danger, fontFamily: fonts.displayBold },
});
