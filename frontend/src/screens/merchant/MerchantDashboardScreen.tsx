import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { merchantStats, merchantIncomingOrders } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type } from "../../theme/theme";

export default function MerchantDashboardScreen({ navigation }: any) {
  const { setRole } = useAuth();
  const pendingCount = merchantIncomingOrders.filter((o) => o.status !== "delivered").length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.headerRow}>
          <View>
            <Text style={type.bodyMuted}>Ah Seng Noodle House</Text>
            <Text style={type.h1}>Merchant dashboard</Text>
          </View>
          <Pressable
            style={styles.exitBtn}
            onPress={() => {
              setRole("customer");
              navigation.navigate("MainTabs");
            }}
          >
            <Text style={styles.exitBtnText}>Exit</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{merchantStats.todayOrders}</Text>
            <Text style={type.small}>Orders today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>RM {merchantStats.todayRevenue.toFixed(0)}</Text>
            <Text style={type.small}>Revenue today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{merchantStats.avgPrepMinutes}m</Text>
            <Text style={type.small}>Avg. prep time</Text>
          </View>
        </View>

        <Pressable style={styles.navCard} onPress={() => navigation.navigate("MerchantOrderQueue")}>
          <Text style={{ fontSize: 22 }}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Incoming orders</Text>
            <Text style={type.bodyMuted}>{pendingCount} order{pendingCount !== 1 ? "s" : ""} need attention</Text>
          </View>
          <Badge label={String(pendingCount)} tone="primary" />
        </Pressable>

        <Pressable style={styles.navCard} onPress={() => navigation.navigate("MerchantMenu")}>
          <Text style={{ fontSize: 22 }}>🍜</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Menu management</Text>
            <Text style={type.bodyMuted}>Update dishes, prices, and sold-out status</Text>
          </View>
          <Text style={{ color: colors.textFaint }}>{"›"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  exitBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exitBtnText: { fontSize: 13, fontWeight: "600", color: colors.text },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
