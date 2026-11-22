import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Badge from "../../shared/components/Badge";
import EmptyState from "../../shared/components/EmptyState";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { api, errorText } from "../../shared/api/client";
import { colors, radius, spacing, type } from "../../shared/theme/theme";
import { useTranslation } from "react-i18next";
import { timeAgo } from "../../shared/i18n/labels";

export type Announcement = { id: string; authorType: "admin" | "merchant"; merchantId?: string; merchantName?: string; title: string; body: string; pinned: boolean; createdAt: number };

// Notices from ScootMeal and from shops. Tap a shop's notice to open the shop.
// The notices themselves stay in the language they were written in.
export default function AnnouncementsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setItems((await api<{ announcements: Announcement[] }>("GET", "/announcements")).announcements); setError(""); } catch (e) { setError(errorText(e)); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("menu.announcements")} subtitle={t("news.subtitle")} />
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chili }]}>{error}</Text> : null}
      {items === null && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <FlatList
          data={items ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="megaphone-outline" title={t("news.none")} hint={t("news.noneHint")} />}
          renderItem={({ item: a }) => (
            <Pressable style={[styles.card, a.pinned && styles.pinned]} disabled={!a.merchantId} onPress={() => a.merchantId && navigation.navigate("Stall", { merchantId: a.merchantId })} accessibilityRole={a.merchantId ? "button" : "text"} testID={`announcement-${a.id}`}>
              <View style={styles.top}>
                <Ionicons name={a.authorType === "admin" ? "megaphone" : "storefront"} size={16} color={colors.turmericDeep} />
                <Text style={[type.small, { flex: 1 }]}>{a.authorType === "admin" ? "ScootMeal" : a.merchantName} · {timeAgo(a.createdAt)}</Text>
                {a.pinned ? <Badge label={t("news.pinned")} tone="warning" /> : null}
              </View>
              <Text style={type.h3}>{a.title}</Text>
              <Text style={type.body}>{a.body}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 4 },
  pinned: { borderColor: colors.turmeric, backgroundColor: colors.amberTint },
  top: { flexDirection: "row", alignItems: "center", gap: 6 },
});
