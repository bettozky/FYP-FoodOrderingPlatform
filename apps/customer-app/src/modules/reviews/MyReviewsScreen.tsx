import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { api, errorText } from "../../shared/api/client";
import { confirmAsync } from "../../shared/util/confirm";
import DishImage from "../../shared/components/DishImage";
import EmptyState from "../../shared/components/EmptyState";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { colors, fonts, radius, spacing, type, ui } from "../../shared/theme/theme";
import ReviewCard from "./ReviewCard";
import ReviewEditor from "./ReviewEditor";
import type { PendingItem, ReviewItem } from "./types";

type Tab = "todo" | "mine";
type Editing = { kind: "new"; item: PendingItem } | { kind: "edit"; review: ReviewItem } | null;

// "My reviews": dishes I have received but not rated yet, and the reviews I have written (edit or delete them).
export default function MyReviewsScreen({ navigation, route }: any) {
  const [tab, setTab] = useState<Tab>(route?.params?.tab === "mine" ? "mine" : "todo");
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [mine, setMine] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([
        api<{ pending: PendingItem[] }>("GET", "/reviews/pending"),
        api<{ reviews: ReviewItem[] }>("GET", "/reviews/mine"),
      ]);
      setPending(p.pending);
      setMine(m.reviews);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { if (route?.params?.tab) setTab(route.params.tab === "mine" ? "mine" : "todo"); }, [route?.params?.tab]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const submit = async (rating: number, comment: string) => {
    if (!editing) return;
    if (editing.kind === "new") await api("POST", `/orders/${editing.item.orderId}/reviews`, { dishId: editing.item.dishId, rating, comment: comment || undefined });
    else await api("PATCH", `/reviews/${editing.review.id}`, { rating, comment });
    await load();
    if (editing.kind === "new") setTab("mine");
  };

  const remove = async (r: ReviewItem) => {
    if (!(await confirmAsync("Delete this review?", "It will disappear for everyone. You can review the dish again afterwards.", "Delete"))) return;
    try { await api("DELETE", `/reviews/${r.id}`); await load(); } catch (e) { setError(errorText(e)); }
  };

  const loading = pending === null || mine === null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="My reviews" subtitle="Rate what you ate and manage what you wrote." />
      <View style={styles.tabs}>
        {([["todo", `To review${pending?.length ? ` (${pending.length})` : ""}`], ["mine", `My reviews${mine?.length ? ` (${mine.length})` : ""}`]] as [Tab, string][]).map(([t, label]) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[ui.chip, tab === t && ui.chipOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} testID={`tab-${t}`}>
            <Text style={[ui.chipText, tab === t && ui.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.wrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : null}

        {!loading && tab === "todo" ? (
          pending!.length === 0 ? (
            <EmptyState icon="happy-outline" title="You are all caught up" hint="Dishes you have received will show up here so you can rate them." />
          ) : (
            pending!.map((p) => (
              <View key={`${p.orderId}-${p.dishId}`} style={styles.row} testID={`todo-${p.dishId}`}>
                <DishImage image={p.image ?? ""} size={52} shape="circle" label={p.dishName} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={type.h3} numberOfLines={1}>{p.dishName}</Text>
                  <Text style={type.small} numberOfLines={1}>{p.merchantName} · order #{p.orderId}</Text>
                </View>
                <Pressable style={styles.rateBtn} onPress={() => setEditing({ kind: "new", item: p })} accessibilityRole="button" accessibilityLabel={`Rate ${p.dishName}`} testID={`rate-${p.dishId}`}>
                  <Ionicons name="star" size={14} color={colors.ink} />
                  <Text style={styles.rateText}>Rate</Text>
                </Pressable>
              </View>
            ))
          )
        ) : null}

        {!loading && tab === "mine" ? (
          mine!.length === 0 ? (
            <EmptyState icon="star-outline" title="No reviews yet" hint="After you receive an order, rate the dishes to help other students choose." />
          ) : (
            mine!.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                showShop
                footer={
                  <View style={styles.actions}>
                    <Pressable onPress={() => setEditing({ kind: "edit", review: r })} style={styles.action} accessibilityRole="button" testID={`edit-review-${r.id}`}>
                      <Ionicons name="create-outline" size={16} color={colors.ink} /><Text style={styles.actionText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => remove(r)} style={styles.action} accessibilityRole="button" testID={`delete-review-${r.id}`}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} /><Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
                    </Pressable>
                    <Pressable onPress={() => r.dishId && navigation.navigate("DishDetail", { dishId: r.dishId })} style={[styles.action, { marginLeft: "auto" }]} accessibilityRole="button">
                      <Text style={styles.actionText}>View dish</Text><Ionicons name="chevron-forward" size={14} color={colors.ink} />
                    </Pressable>
                  </View>
                }
              />
            ))
          )
        ) : null}
      </ScrollView>

      <ReviewEditor
        visible={!!editing}
        title={editing?.kind === "edit" ? "Edit your review" : `Rate ${editing?.kind === "new" ? editing.item.dishName : ""}`}
        subtitle={editing?.kind === "edit" ? editing.review.dishName : editing?.kind === "new" ? editing.item.merchantName : undefined}
        initial={editing?.kind === "edit" ? { rating: editing.review.rating, comment: editing.review.comment } : undefined}
        submitLabel={editing?.kind === "edit" ? "Save changes" : "Submit review"}
        onSubmit={submit}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  wrap: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl * 3 },
  row: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm },
  rateBtn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.turmeric },
  rateText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm, alignItems: "center" },
  action: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  actionText: { fontSize: 13, color: colors.ink, fontFamily: fonts.display },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
});
