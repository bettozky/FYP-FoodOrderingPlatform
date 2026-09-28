import React from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { activeOrder, orderHistory } from "../../data/mockData";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type } from "../../theme/theme";

export default function OrdersScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={type.h1}>Orders</Text>
      </View>

      <FlatList
        data={orderHistory}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Pressable style={styles.activeCard} onPress={() => navigation.navigate("OrderTracking")}>
            <View style={{ flex: 1 }}>
              <Text style={type.small}>ACTIVE ORDER</Text>
              <Text style={type.h3}>{activeOrder.merchantName}</Text>
              <Text style={type.bodyMuted}>
                {activeOrder.items.map((i) => i.name).join(", ")}
              </Text>
            </View>
            <Badge label={`${activeOrder.etaMinutes} min`} tone="primary" />
          </Pressable>
        }
        renderItem={({ item }) => (
          <View style={styles.orderRow}>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{item.merchantName}</Text>
              <Text style={type.bodyMuted} numberOfLines={1}>
                {item.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
              </Text>
              <Text style={type.small}>{item.placedAt} · {item.mode}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text style={type.h3}>RM {item.total.toFixed(2)}</Text>
              <Badge label="Delivered" tone="success" />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  activeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
});
