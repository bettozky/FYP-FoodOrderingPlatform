import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import EmptyState from "../../../shared/components/EmptyState";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import { api, errorText } from "../../../shared/api/client";
import { Job } from "../../../shared/api/types";
import SearchField from "../../../shared/components/SearchField";
import { colors, layout, radius, spacing, type, ui, font } from "../../../shared/theme/theme";

// FR-4.1: F&B job listings posted by merchants. Tap one to read it and apply.
export default function JobsScreen({ navigation }: any) {
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
        title="Jobs"
        subtitle="Part-time F&B work near campus"
        right={<Pressable onPress={() => navigation.navigate("MyApplications")} hitSlop={8} style={styles.mine} accessibilityRole="button" testID="my-applications"><Text style={styles.mineText}>My applications</Text></Pressable>}
      />
      <SearchField value={q} onChangeText={setQ} placeholder="Search jobs or shops" style={styles.search} testID="job-search" />
      {types.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
          {["", ...types].map((t) => (
            <Pressable key={t || "all"} onPress={() => setKind(t)} style={[ui.chip, kind === t && ui.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: kind === t }}>
              <Text style={[ui.chipText, kind === t && ui.chipTextOn]}>{t || "All"}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chiliText }]}>{error}</Text> : null}
      {jobs === null && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <FlatList
          data={shown}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.ink} colors={[colors.ink]} />}
          ListEmptyComponent={<EmptyState icon="briefcase-outline" title="No vacancies found" hint={q || kind ? "Try a different search." : "Check back soon. New openings appear here."} />}
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={() => navigation.navigate("JobDetail", { jobId: item.id })} accessibilityRole="button" accessibilityLabel={`${item.title} at ${item.merchantName}`} testID={`job-${item.id}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                <Text style={[type.h3, { flex: 1 }]} numberOfLines={2}>{item.title}</Text>
                {item.applied ? <Badge label="Applied" tone="success" /> : <Badge label={item.type} tone="primary" />}
              </View>
              <Text style={type.bodyMuted}>{item.merchantName}</Text>
              {item.description ? <Text style={type.body} numberOfLines={2}>{item.description}</Text> : null}
              <View style={styles.foot}>
                <Text style={type.price}>{item.pay}</Text>
                <View style={styles.moreRow}>
                  <Text style={styles.more}>View and apply</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.amberText} />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, padding: spacing.lg, gap: 6 },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  moreRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  more: { ...font.displayBold, fontSize: 14, color: colors.amberText },
  mine: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft, justifyContent: "center" },
  mineText: { ...font.displayBold, fontSize: 14, color: colors.ink },
  search: { marginHorizontal: layout.gutter },
  chips: { gap: spacing.sm, paddingHorizontal: layout.gutter, paddingTop: spacing.md },
});
