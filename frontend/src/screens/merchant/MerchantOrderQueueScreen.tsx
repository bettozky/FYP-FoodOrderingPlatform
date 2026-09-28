import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { merchantIncomingOrders, MerchantOrder, OrderStatus } from "../../data/mockData";
import ScreenHeader from "../../components/ScreenHeader";
import Badge from "../../components/Badge";
import { colors, radius, spacing, type, fonts } from "../../theme/theme";

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "preparing",
  preparing: "ready",
  ready: "on_the_way",
};

const statusTone: Record<OrderStatus, "primary" | "warning" | "success" | "neutral"> = {
  placed: "primary",
  preparing: "warning",
  ready: "success",
  on_the_way: "success",
  delivered: "neutral",
};

const statusLabel: Record<OrderStatus, string> = {
  placed: "New",
  preparing: "Preparing",
  ready: "Ready for pickup",
  on_the_way: "Out for delivery",
  delivered: "Delivered",
};

export default function MerchantOrderQueueScreen() {
  const [orders, setOrders] = useState<MerchantOrder[]>(merchantIncomingOrders);

  const advance = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id && nextStatus[o.status] ? { ...o, status: nextStatus[o.status]! } : o))
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Incoming orders" subtitle={`${orders.length} active`} />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={type.h3}>{item.id}</Text>
              <Badge label={statusLabel[item.status]} tone={statusTone[item.status]} />
            </View>
            <Text style={type.bodyMuted}>{item.customerName} · {item.mode} · {item.placedAt}</Text>
            <View style={styles.itemsWrap}>
              {item.items.map((it) => (
                <Text key={it.dishId} style={type.body}>
                  {it.qty}x {it.name}
                </Text>
              ))}
            </View>
            <View style={styles.rowBetween}>
              <Text style={type.h3}>RM {item.total.toFixed(2)}</Text>
              {nextStatus[item.status] && (
                <Pressable style={styles.advanceBtn} onPress={() => advance(item.id)}>
                  <Text style={styles.advanceBtnText}>
                    Mark as {statusLabel[nextStatus[item.status]!]}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemsWrap: { marginTop: 4, marginBottom: 4, gap: 2 },
  advanceBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  advanceBtnText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 12 },
});
