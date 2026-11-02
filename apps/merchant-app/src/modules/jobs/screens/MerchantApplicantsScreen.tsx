import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Badge from "../../../shared/components/Badge";
import EmptyState from "../../../shared/components/EmptyState";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Avatar from "../../../shared/components/Avatar";
import { api, errorText } from "../../../shared/api/client";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";
import { ApplicationStatus, DAY_LABEL, fmtDate, STATUS_LABEL, STATUS_TONE } from "../applicationStatus";

type Row = { id: string; jobId: string; jobTitle: string; fullName: string; institution?: string; course?: string; availableDays: string[]; hoursPerWeek?: number; status: ApplicationStatus; createdAt: number; hasResume: boolean; avatar?: string };
type Data = { counts: Record<string, number>; applications: Row[] };

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" }, { key: "submitted", label: "New" }, { key: "shortlisted", label: "Shortlisted" }, { key: "interview", label: "Interview" }, { key: "hired", label: "Hired" }, { key: "rejected", label: "Rejected" },
];

// People who applied for the shop's jobs (all jobs, or one job when opened from the job board).
export default function MerchantApplicantsScreen({ navigation, route }: any) {
  const jobId: string | undefined = route.params?.jobId;
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = [jobId && `jobId=${jobId}`, status && `status=${status}`, q.trim() && `q=${encodeURIComponent(q.trim())}`].filter(Boolean).join("&");
      setData(await api<Data>("GET", `/merchant/applications${qs ? `?${qs}` : ""}`));
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, [jobId, status, q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Applicants" subtitle={jobId ? route.params?.jobTitle ?? "For this job" : "Everyone who applied for your jobs"} />
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.stone} />
        <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Search by name or university" placeholderTextColor={colors.textFaint} testID="applicant-search" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((f) => {
          const n = f.key ? data?.counts[f.key] ?? 0 : data?.counts.all ?? 0;
          return (
            <Pressable key={f.key || "all"} onPress={() => setStatus(f.key)} style={[styles.chip, status === f.key && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: status === f.key }} testID={`filter-${f.key || "all"}`}>
              <Text style={[styles.chipText, status === f.key && { color: colors.white }]}>{f.label}{data ? ` (${n})` : ""}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chili }]}>{error}</Text> : null}
      {!data && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <FlatList
          data={data?.applications ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No applicants here" hint="When students apply for your jobs in the customer app, they show up here." />}
          renderItem={({ item: a }) => (
            <Pressable style={[styles.card, a.status === "submitted" && styles.fresh]} onPress={() => navigation.navigate("MerchantApplicantDetail", { applicationId: a.id })} accessibilityRole="button" testID={`applicant-${a.id}`}>
              <Avatar uri={a.avatar} name={a.fullName} size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Text style={type.h3} numberOfLines={1}>{a.fullName}</Text>
                <Text style={type.small} numberOfLines={1}>{a.jobTitle} · {fmtDate(a.createdAt)}</Text>
                <Text style={type.small} numberOfLines={1}>{[a.institution, a.course].filter(Boolean).join(" · ") || "No university given"}</Text>
                <Text style={type.small} numberOfLines={1}>{a.availableDays.map((d) => DAY_LABEL[d] ?? d).join(", ")}{a.hoursPerWeek ? ` · ${a.hoursPerWeek} h/wk` : ""}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Badge label={STATUS_LABEL[a.status]} tone={STATUS_TONE[a.status]} />
                {a.hasResume ? <Ionicons name="document-attach" size={16} color={colors.stoneText} /> : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, minHeight: 44, color: colors.ink },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chip: { minHeight: 34, paddingHorizontal: 14, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, color: colors.ink },
  card: { flexDirection: "row", gap: spacing.md, alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  fresh: { borderColor: colors.turmeric, backgroundColor: colors.amberTint },
});
