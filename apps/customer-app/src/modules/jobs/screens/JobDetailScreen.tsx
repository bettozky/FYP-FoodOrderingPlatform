import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Badge from "../../../shared/components/Badge";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { api, errorText } from "../../../shared/api/client";
import { Job, JobApplication } from "../../../shared/api/types";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";
import { STATUS_HELP, STATUS_LABEL, STATUS_TONE } from "../status";

// One vacancy: what the job is, what it pays, and the Apply button (or the state of my application).
export default function JobDetailScreen({ navigation, route }: any) {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Job | null>(null);
  const [mine, setMine] = useState<JobApplication | null>(null);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => {
    api<{ job: Job; myApplication: JobApplication | null }>("GET", `/jobs/${jobId}`)
      .then((r) => { setJob(r.job); setMine(r.myApplication); setError(""); })
      .catch((e) => setError(errorText(e)));
  }, [jobId]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Job details" />
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chili }]}>{error}</Text> : null}
      {!job && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : null}
      {job ? (
        <>
          <ScrollView contentContainerStyle={styles.wrap}>
            <Text style={type.h1}>{job.title}</Text>
            <Pressable onPress={() => navigation.navigate("Stall", { merchantId: job.merchantId })} accessibilityRole="button"><Text style={[type.bodyMuted, { textDecorationLine: "underline" }]}>{job.merchantName}</Text></Pressable>
            <View style={styles.chips}>
              <Badge label={job.type} tone="primary" />
              {job.role ? <Badge label={job.role} tone="neutral" /> : null}
              {job.openings ? <Badge label={`${job.openings} opening${job.openings > 1 ? "s" : ""}`} tone="neutral" /> : null}
            </View>
            <View style={styles.pay}><Ionicons name="cash-outline" size={18} color={colors.ink} /><Text style={type.price}>{job.pay}</Text></View>
            {job.description ? <><Text style={styles.h}>About the job</Text><Text style={type.body}>{job.description}</Text></> : null}
            {job.perks ? <><Text style={styles.h}>Perks</Text><Text style={type.body}>{job.perks}</Text></> : null}
            <Text style={styles.h}>What you will need to apply</Text>
            <Text style={type.bodyMuted}>Your contact details, the days you can work, and a short note. A CV is welcome (PDF, Word, JPG or PNG). If you have no CV, tell the shop about any experience.</Text>

            {mine ? (
              <View style={styles.status}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={type.h3}>Your application</Text>
                  <Badge label={STATUS_LABEL[mine.status]} tone={STATUS_TONE[mine.status]} />
                </View>
                <Text style={type.bodyMuted}>{STATUS_HELP[mine.status]}</Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            {mine ? (
              <PrimaryButton label="View my application" variant="outline" onPress={() => navigation.navigate("MyApplications")} />
            ) : job.open === false ? (
              <PrimaryButton label="This vacancy is closed" disabled />
            ) : (
              <PrimaryButton label="Apply now" onPress={() => navigation.navigate("ApplyJob", { job })} testID="apply-now" />
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  pay: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: spacing.xs },
  h: { fontSize: 13, fontWeight: "700", color: colors.stoneText, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.md },
  status: { marginTop: spacing.lg, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine, padding: spacing.md, gap: 4 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
});
