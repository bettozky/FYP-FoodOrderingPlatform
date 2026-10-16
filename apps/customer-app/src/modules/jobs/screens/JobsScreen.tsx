import React, { useEffect, useState } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { View, Text, FlatList, StyleSheet } from "react-native";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import { api, errorText } from "../../../shared/api/client";
import { Job } from "../../../shared/api/types";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";

// FR-4.1: F&B job listings posted by merchants.
export default function JobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ jobs: Job[] }>("GET", "/jobs").then((r) => setJobs(r.jobs)).catch((e) => setError(errorText(e)));
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Jobs" subtitle="Part-time F&B work near campus" />
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chili }]}>{error}</Text> : null}
      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        ListEmptyComponent={<EmptyState icon="briefcase-outline" title="No vacancies right now" hint="Check back soon. New openings appear here." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
              <Text style={[type.h3, { flex: 1 }]}>{item.title}</Text>
              <Badge label={item.type} tone="primary" />
            </View>
            <Text style={type.bodyMuted}>{item.merchantName}</Text>
            <Text style={type.body}>{item.description}</Text>
            <Text style={type.price}>{item.pay}</Text>
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 4 },
});
