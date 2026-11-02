import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import EmptyState from "../../shared/components/EmptyState";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { api, errorText } from "../../shared/api/client";
import { isInboxType } from "./inbox";
import { colors, radius, spacing, type } from "../../shared/theme/theme";

type N = { id: string; type: string; title: string; body: string; data?: Record<string, any>; createdAt: number; ackedAt?: number };

const iconFor = (t: string): keyof typeof Ionicons.glyphMap => (t.includes("application") ? "people" : t.includes("review") ? "star" : t.includes("announcement") ? "megaphone" : "notifications");
const when = (t: number) => new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Everything the shop was told: new applicants, reviews, admin notices. Tapping one marks it read and opens the related page.
export default function MerchantNotificationsScreen({ navigation }: any) {
  const [list, setList] = useState<N[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ notifications: N[] }>("GET", "/notifications?all=true");
      setList(r.notifications.filter((n) => isInboxType(n.type)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100));
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = async (n: N) => {
    if (!n.ackedAt) api("POST", `/notifications/${n.id}/ack`).then(load).catch(() => {});
    const t = n.type;
    if (t.startsWith("job_application") && n.data?.applicationId) navigation.navigate("MerchantApplicantDetail", { applicationId: n.data.applicationId });
    else if (t.includes("review")) navigation.navigate("MerchantReviews");
  };
  const readAll = async () => { await Promise.all((list ?? []).filter((n) => !n.ackedAt).map((n) => api("POST", `/notifications/${n.id}/ack`).catch(() => {}))); load(); };
  const unread = list?.filter((n) => !n.ackedAt).length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Notifications" subtitle={unread ? `${unread} unread` : "All caught up"} />
      {unread ? <Pressable onPress={readAll} style={styles.readAll} accessibilityRole="button" testID="read-all"><Text style={styles.readAllText}>Mark all as read</Text></Pressable> : null}
      {error ? <Text style={{ color: colors.chiliText, padding: spacing.lg }}>{error}</Text> : null}
      {!list && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <FlatList
          data={list ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="notifications-outline" title="Nothing yet" hint="New applicants, reviews and notices from ScootMeal will show up here." />}
          renderItem={({ item: n }) => (
            <Pressable onPress={() => open(n)} style={[styles.card, !n.ackedAt && styles.unread]} accessibilityRole="button" accessibilityLabel={`${n.title}. ${n.body}`}>
              <Ionicons name={iconFor(n.type)} size={20} color={colors.ink} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.h3}>{n.title}</Text>
                <Text style={type.body}>{n.body}</Text>
                <Text style={type.small}>{when(n.createdAt)}</Text>
              </View>
              {!n.ackedAt ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  readAll: { alignSelf: "flex-end", marginRight: spacing.lg, paddingVertical: 6 },
  readAllText: { fontWeight: "700", color: colors.turmericDeep, fontSize: 13.5 },
  card: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  unread: { backgroundColor: colors.amberTint, borderColor: colors.turmeric },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.chili, marginTop: 4 },
});
