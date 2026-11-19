import React from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import Badge from "../../../shared/components/Badge";
import { MODE_LABEL } from "../../../shared/api/types";
import { useCountdown, mmss } from "../../../shared/util/format";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, layout, radius, spacing, type } from "../../../shared/theme/theme";
import { useLive } from "../LiveDataContext";
import { isActive, orderBadge } from "../orderStatus";
import { useReorder } from "../useReorder";

function Countdown({ deadline }: { deadline: number }) {
  const s = useCountdown(deadline);
  return <Text style={type.small}>Restaurant replies in {mmss(s)}</Text>;
}

export default function OrdersScreen({ navigation }: any) {
  const { orders } = useLive();
  const { reorder, busyId } = useReorder(navigation);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={type.h1} accessibilityRole="header">Orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="No orders yet" hint="Your orders and their live status show up here." action="Find something to eat" onAction={() => navigation.navigate("MainTabs", { tab: "home", nonce: Date.now() })} />
        }
        renderItem={({ item }) => {
          const b = orderBadge(item);
          const modes = [...new Set(item.items.map((i) => MODE_LABEL[i.mode]))].join(" + ");
          return (
            <Pressable style={({ pressed }) => [styles.orderRow, isActive(item) && styles.orderActive, pressed && { opacity: 0.85 }]} onPress={() => navigation.navigate("OrderTracking", { orderId: item.id })} testID={`order-${item.id}`}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={type.h3} numberOfLines={1}>{item.merchantName}</Text>
                <Text style={type.bodyMuted} numberOfLines={2}>{item.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</Text>
                <Text style={type.small}>#{item.id} · {modes} · {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                {item.status === "awaiting_merchant" && <Countdown deadline={item.respondBy} />}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={styles.total}>RM {item.total.toFixed(2)}</Text>
                <Badge label={b.label} tone={b.tone} />
                {!isActive(item) && (
                  <Pressable onPress={() => reorder(item)} disabled={busyId === item.id} hitSlop={6} style={styles.again} accessibilityRole="button" accessibilityLabel={`Order again from ${item.merchantName}`} testID={`reorder-${item.id}`}>
                    <Ionicons name="refresh" size={14} color={colors.ink} />
                    <Text style={styles.againText}>{busyId === item.id ? "Adding…" : "Order again"}</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: layout.gutter, paddingBottom: spacing.md },
  list: { paddingHorizontal: layout.gutter, paddingBottom: layout.tabBarClearance },
  orderRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.stoneLine, gap: spacing.md },
  total: { ...font.displayBold, fontSize: 16, color: colors.ink, fontVariant: ["tabular-nums"] },
  again: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, minHeight: 36, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft },
  againText: { ...font.displayBold, fontSize: 13, color: colors.ink },
  // Live orders stand out with an amber edge all round (not a side stripe) and a soft tint.
  orderActive: { borderColor: colors.amberBorder, backgroundColor: colors.amberTint },
});
