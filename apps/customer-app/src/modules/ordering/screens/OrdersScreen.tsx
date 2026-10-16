import React from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import Badge from "../../../shared/components/Badge";
import { MODE_LABEL } from "../../../shared/api/types";
import { useCountdown, mmss } from "../../../shared/util/format";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";
import { useLive } from "../LiveDataContext";
import { isActive, orderBadge } from "../orderStatus";

function Countdown({ deadline }: { deadline: number }) {
  const s = useCountdown(deadline);
  return <Text style={type.small}>Restaurant replies in {mmss(s)}</Text>;
}

export default function OrdersScreen({ navigation }: any) {
  const { orders } = useLive();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={type.h1}>Orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="No orders yet" hint="Your orders and their live status show up here." />
        }
        renderItem={({ item }) => {
          const b = orderBadge(item);
          const modes = [...new Set(item.items.map((i) => MODE_LABEL[i.mode]))].join(" + ");
          return (
            <Pressable style={[styles.orderRow, isActive(item) && styles.orderActive]} onPress={() => navigation.navigate("OrderTracking", { orderId: item.id })} testID={`order-${item.id}`}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.h3}>{item.merchantName}</Text>
                <Text style={type.bodyMuted} numberOfLines={2}>{item.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</Text>
                <Text style={type.small}>#{item.id} · {modes} · {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                {item.status === "awaiting_merchant" && <Countdown deadline={item.respondBy} />}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={type.h3}>RM {item.total.toFixed(2)}</Text>
                <Badge label={b.label} tone={b.tone} />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  orderRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  orderActive: { borderColor: colors.turmeric, backgroundColor: colors.primarySoft },
});
