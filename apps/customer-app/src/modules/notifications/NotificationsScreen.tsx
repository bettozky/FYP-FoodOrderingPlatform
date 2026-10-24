import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppNotification } from "../../shared/api/types";
import EmptyState from "../../shared/components/EmptyState";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { colors, fonts, radius, spacing, type } from "../../shared/theme/theme";
import { useLive } from "../ordering/LiveDataContext";

// Real alerts from GET /notifications (the same feed the pop-ups use). They stay here until dismissed.
const iconFor = (t: string): keyof typeof Ionicons.glyphMap =>
  t.startsWith("reservation") || t.startsWith("preorder") ? "calendar" : t === "food_ready" ? "restaurant" : t.startsWith("order") || t === "delivered" || t === "handed_over" ? "receipt" : "notifications";

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function NotificationsScreen({ navigation }: any) {
  const { notifications, ack } = useLive();
  const list = [...notifications].sort((a, b) => b.createdAt - a.createdAt);

  const open = (n: AppNotification) => {
    const orderId = n.data?.orderId;
    if (orderId) navigation.navigate("OrderTracking", { orderId });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title="Notifications"
        subtitle="Alerts you haven't dismissed yet."
        right={
          list.length > 1 ? (
            <Pressable onPress={() => list.forEach((n) => ack(n.id))} hitSlop={10} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Dismiss all notifications">
              <Text style={styles.clearText}>Dismiss all</Text>
            </Pressable>
          ) : undefined
        }
      />
      <FlatList
        data={list}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="notifications-outline" title="No new notifications" hint="Alerts are not kept once you dismiss them. Open the Orders tab for the latest status of each order." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable style={styles.main} onPress={() => open(item)} disabled={!item.data?.orderId} accessibilityRole={item.data?.orderId ? "button" : "text"} accessibilityLabel={`${item.title}. ${item.body}`}>
              <View style={styles.icon}><Ionicons name={iconFor(item.type)} size={18} color={colors.ink} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={type.h3}>{item.title}</Text>
                <Text style={type.bodyMuted}>{item.body}</Text>
                <Text style={type.small}>{clock(item.createdAt)}</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => ack(item.id)} hitSlop={10} style={styles.dismiss} accessibilityRole="button" accessibilityLabel={`Dismiss ${item.title}`}>
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  main: { flex: 1, flexDirection: "row", gap: spacing.md, minWidth: 0 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  dismiss: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  clearBtn: { minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.sm },
  clearText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
});
