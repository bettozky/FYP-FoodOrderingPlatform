import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import EmptyState from "../../../shared/components/EmptyState";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import { api, errorText } from "../../../shared/api/client";
import { Job } from "../../../shared/api/types";
import { colors, radius, spacing, type, ui } from "../../../shared/theme/theme";

// FR-4.1: F&B job listings posted by merchants. Tap one to read it and apply.
// Job titles, types ("Part-time") and pay are written by the shops, so they stay as written.
export default function JobsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setJobs((await api<{ jobs: Job[] }>("GET", "/jobs")).jobs);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const types = [...new Set((jobs ?? []).map((j) => j.type))];
  const shown = (jobs ?? []).filter((j) => (!kind || j.type === kind) && (!q.trim() || `${j.title} ${j.role ?? ""} ${j.merchantName}`.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={t("menu.jobs")}
        subtitle={t("jobs.subtitle")}
        right={<Pressable onPress={() => navigation.navigate("MyApplications")} hitSlop={8} style={styles.mine} accessibilityRole="button" testID="my-applications"><Text style={styles.mineText}>{t("jobs.myApplications")}</Text></Pressable>}
      />
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.stone} />
        <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder={t("jobs.search")} placeholderTextColor={colors.textFaint} accessibilityLabel={t("jobs.search")} testID="job-search" />
      </View>
      {types.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
          {["", ...types].map((k) => (
            <Pressable key={k || "all"} onPress={() => setKind(k)} style={[ui.chip, kind === k && ui.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: kind === k }}>
              <Text style={[ui.chipText, kind === k && ui.chipTextOn]}>{k || t("home.all")}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chili }]}>{error}</Text> : null}
      {jobs === null && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <FlatList
          data={shown}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="briefcase-outline" title={t("jobs.none")} hint={q || kind ? t("jobs.tryOther") : t("jobs.checkBack")} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate("JobDetail", { jobId: item.id })} accessibilityRole="button" accessibilityLabel={t("jobs.atShop", { title: item.title, shop: item.merchantName })} testID={`job-${item.id}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                <Text style={[type.h3, { flex: 1 }]}>{item.title}</Text>
                {item.applied ? <Badge label={t("jobs.applied")} tone="success" /> : <Badge label={item.type} tone="primary" />}
              </View>
              <Text style={type.bodyMuted}>{item.merchantName}</Text>
              {item.description ? <Text style={type.body} numberOfLines={2}>{item.description}</Text> : null}
              <View style={styles.foot}>
                <Text style={type.price}>{item.pay}</Text>
                <Text style={styles.more}>{t("jobs.viewApply")} ›</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 4 },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  more: { fontSize: 13, color: colors.turmericDeep, fontWeight: "700" },
  mine: { minHeight: 34, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  mineText: { fontSize: 12.5, color: colors.ink, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine },
  searchInput: { flex: 1, color: colors.ink, minHeight: 44 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
