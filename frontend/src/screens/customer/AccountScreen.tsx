import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { loyalty } from "../../data/mockData";
import { colors, radius, spacing, type, fonts } from "../../theme/theme";

const menuItems = [
  { icon: "📍", label: "Delivery addresses" },
  { icon: "💳", label: "Payment methods" },
  { icon: "🔔", label: "Notifications" },
  { icon: "❓", label: "Help & support" },
];

export default function AccountScreen({ navigation }: any) {
  const { name, logout, setRole } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name || "S")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{name || "Student"}</Text>
            <Text style={type.bodyMuted}>{loyalty.tier} member · {loyalty.points} pts</Text>
          </View>
        </View>

        <View style={styles.section}>
          {menuItems.map((m) => (
            <Pressable key={m.label} style={styles.menuRow}>
              <Text style={{ fontSize: 18 }}>{m.icon}</Text>
              <Text style={[type.body, { flex: 1 }]}>{m.label}</Text>
              <Text style={{ color: colors.textFaint }}>{"›"}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.merchantSwitch}
          onPress={() => {
            setRole("merchant");
            navigation.navigate("MerchantDashboard");
          }}
        >
          <Text style={{ fontSize: 18 }}>🏪</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.body}>Switch to merchant view</Text>
            <Text style={type.small}>For canteen vendors on ScootMeal</Text>
          </View>
          <Text style={{ color: colors.textFaint }}>{"›"}</Text>
        </Pressable>

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
  merchantSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  logoutBtn: { marginTop: spacing.xl, alignItems: "center", paddingVertical: spacing.md },
  logoutText: { color: colors.danger, fontFamily: fonts.displayBold },
});
