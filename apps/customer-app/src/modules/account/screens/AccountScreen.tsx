import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Badge from "../../../shared/components/Badge";
import { loyalty } from "../../../shared/data/mockData";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";

// `go` = a screen that exists. Rows without it have nothing behind them yet, so they are shown as
// "Soon" and disabled instead of looking tappable and doing nothing.
const menuItems: { icon: string; label: string; go?: string }[] = [
  { icon: "❤️", label: "Saved dishes", go: "Favourites" },
  { icon: "📍", label: "Delivery addresses", go: "Addresses" },
  { icon: "💼", label: "Jobs", go: "Jobs" },
  { icon: "💳", label: "Payment methods" },
  { icon: "🔔", label: "Notifications" },
  { icon: "❓", label: "Help & support" },
];

export default function AccountScreen({ navigation }: any) {
  const { name, user, logout } = useAuth();

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
              style={[styles.menuRow, !m.go && { opacity: 0.6 }]}
              disabled={!m.go}
              onPress={() => m.go && navigation.navigate(m.go)}
              accessibilityRole="button"
              accessibilityLabel={m.go ? m.label : `${m.label}, coming soon`}
              accessibilityState={{ disabled: !m.go }}
            >
              <Text style={{ fontSize: 18 }}>{m.icon}</Text>
              <Text style={[type.body, { flex: 1 }]}>{m.label}</Text>
              {m.go ? <Text style={{ color: colors.stone }}>{"›"}</Text> : <Badge label="Soon" tone="neutral" />}
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
