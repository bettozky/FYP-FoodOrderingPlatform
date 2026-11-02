import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Badge from "../../../shared/components/Badge";
import EmptyState from "../../../shared/components/EmptyState";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { api, errorText } from "../../../shared/api/client";
import { JobApplication } from "../../../shared/api/types";
import { confirmAsync } from "../../../shared/util/confirm";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";
import { fmtDate, fmtWhen, STATUS_HELP, STATUS_LABEL, STATUS_TONE } from "../status";

// "My job applications": what I applied for, where each one stands, interview details, and withdraw.
export default function MyApplicationsScreen({ navigation, route }: any) {
  const [apps, setApps] = useState<JobApplication[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<string>("");

  const load = useCallback(async () => {
    try {
      setApps((await api<{ applications: JobApplication[] }>("GET", "/applications")).applications);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const withdraw = async (a: JobApplication) => {
    if (!(await confirmAsync("Withdraw this application?", `${a.merchantName} will be told you are no longer interested in ${a.jobTitle}.`, "Withdraw"))) return;
    try { await api("POST", `/applications/${a.id}/withdraw`); await load(); } catch (e) { setError(errorText(e)); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="My applications" subtitle="Track the jobs you applied for" />
      {route?.params?.justApplied ? <View style={styles.thanks}><Ionicons name="checkmark-circle" size={18} color={colors.herb} /><Text style={[type.body, { flex: 1 }]}>Application sent! The shop will see it in their app. We will notify you when they reply.</Text></View> : null}
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chili }]}>{error}</Text> : null}
      {apps === null && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <FlatList
          data={apps ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No applications yet" hint="Find a job you like and tap Apply." />}
          renderItem={({ item: a }) => {
            const expanded = open === a.id;
            return (
              <View style={styles.card} testID={`application-${a.id}`}>
                <Pressable onPress={() => setOpen(expanded ? "" : a.id)} accessibilityRole="button" accessibilityState={{ expanded }}>
                  <View style={styles.top}>
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3}>{a.jobTitle}</Text>
                      <Text style={type.bodyMuted}>{a.merchantName} · applied {fmtDate(a.createdAt)}</Text>
                    </View>
                    <Badge label={STATUS_LABEL[a.status]} tone={STATUS_TONE[a.status]} />
                  </View>
                  <Text style={[type.small, { marginTop: 4 }]}>{STATUS_HELP[a.status]}</Text>
                </Pressable>

                {a.interview && a.status === "interview" ? (
                  <View style={styles.interview}>
                    <Ionicons name="calendar" size={18} color={colors.amberText} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3}>{fmtWhen(a.interview.at)}</Text>
                      {a.interview.place ? <Text style={type.bodyMuted}>{a.interview.place}</Text> : null}
                      {a.interview.message ? <Text style={type.bodyMuted}>{a.interview.message}</Text> : null}
                    </View>
                  </View>
                ) : null}

                {expanded ? (
                  <View style={{ gap: 4, marginTop: spacing.sm }}>
                    {a.history.map((h, i) => (
                      <Text key={i} style={type.small}>• {STATUS_LABEL[h.status]} · {new Date(h.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                    ))}
                    <Text style={type.small}>Documents: {[a.documents.resume?.name, a.documents.other?.name].filter(Boolean).join(", ") || "none attached"}</Text>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Pressable onPress={() => navigation.navigate("JobDetail", { jobId: a.jobId })} style={styles.action} accessibilityRole="button"><Text style={styles.actionText}>View job</Text></Pressable>
                  {!["hired", "withdrawn", "rejected"].includes(a.status) ? (
                    <Pressable onPress={() => withdraw(a)} style={styles.action} accessibilityRole="button" testID={`withdraw-${a.id}`}><Text style={[styles.actionText, { color: colors.danger }]}>Withdraw</Text></Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  top: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  interview: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.amberTint, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  action: { minHeight: 32, justifyContent: "center" },
  actionText: { fontSize: 13.5, fontWeight: "700", color: colors.ink },
  thanks: { flexDirection: "row", gap: spacing.sm, alignItems: "center", margin: spacing.lg, marginBottom: 0, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.herbLight },
});
