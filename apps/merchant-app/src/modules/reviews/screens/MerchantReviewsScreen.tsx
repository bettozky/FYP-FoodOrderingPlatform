import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { api, errorText } from "../../../shared/api/client";
import EmptyState from "../../../shared/components/EmptyState";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { confirmAsync } from "../../../shared/util/confirm";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";

type Review = { id: string; dishName?: string; userName: string; rating: number; comment?: string; createdAt: number; reply?: { text: string; at: number } };
type Data = { average: number | null; count: number; unanswered: number; reviews: Review[] };

// Customer reviews of this shop's dishes. Replies are public and the customer gets a notification.
export default function MerchantReviewsScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [replying, setReplying] = useState<Review | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>("GET", `/merchant/reviews${onlyNew ? "?unanswered=true" : ""}`));
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, [onlyNew]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openReply = (r: Review) => { setReplying(r); setText(r.reply?.text ?? ""); setError(""); };
  const send = async () => {
    if (!replying) return;
    if (!text.trim()) return setError("Write a short reply first.");
    setBusy(true);
    try {
      await api("PUT", `/merchant/reviews/${replying.id}/reply`, { text: text.trim() });
      setReplying(null);
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const removeReply = async (r: Review) => {
    if (!(await confirmAsync("Remove your reply?", "The customer will no longer see it.", "Remove"))) return;
    try { await api("DELETE", `/merchant/reviews/${r.id}/reply`); await load(); } catch (e) { setError(errorText(e)); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Customer reviews" subtitle={data ? `${data.average ?? "–"}★ from ${data.count} ${data.count === 1 ? "review" : "reviews"}` : undefined} />
      <View style={styles.filters}>
        {([[false, "All"], [true, `Needs reply${data?.unanswered ? ` (${data.unanswered})` : ""}`]] as [boolean, string][]).map(([v, label]) => (
          <Pressable key={label} onPress={() => setOnlyNew(v)} style={[styles.chip, onlyNew === v && styles.chipOn]} accessibilityRole="button">
            <Text style={[styles.chipText, onlyNew === v && { color: colors.white }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {error && !replying ? <Text style={styles.error}>{error}</Text> : null}
      {!data && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <FlatList
          data={data?.reviews ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="star-outline" title={onlyNew ? "Nothing waiting for a reply" : "No reviews yet"} hint="Reviews appear after customers receive and rate their food." />}
          renderItem={({ item: r }) => (
            <View style={styles.card} testID={`review-${r.id}`}>
              <View style={styles.top}>
                <Text style={[type.h3, { flex: 1 }]}>{r.userName}</Text>
                <View style={{ flexDirection: "row" }}>
                  {[1, 2, 3, 4, 5].map((n) => <Ionicons key={n} name={n <= r.rating ? "star" : "star-outline"} size={14} color={colors.turmeric} />)}
                </View>
              </View>
              <Text style={type.small}>{r.dishName} · {new Date(r.createdAt).toLocaleDateString()}</Text>
              {r.comment ? <Text style={type.bodyMuted}>{r.comment}</Text> : null}
              {r.reply ? (
                <View style={styles.reply}>
                  <Text style={styles.replyHead}>Your reply</Text>
                  <Text style={type.bodyMuted}>{r.reply.text}</Text>
                </View>
              ) : null}
              <View style={styles.actions}>
                <Pressable onPress={() => openReply(r)} style={styles.action} accessibilityRole="button" testID={`reply-${r.id}`}>
                  <Ionicons name="chatbubble-outline" size={15} color={colors.ink} /><Text style={styles.actionText}>{r.reply ? "Edit reply" : "Reply"}</Text>
                </Pressable>
                {r.reply ? (
                  <Pressable onPress={() => removeReply(r)} style={styles.action} accessibilityRole="button">
                    <Ionicons name="trash-outline" size={15} color={colors.chili} /><Text style={[styles.actionText, { color: colors.chili }]}>Remove reply</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!replying} transparent animationType="fade" onRequestClose={() => setReplying(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={type.h2}>Reply to {replying?.userName}</Text>
            {replying?.comment ? <Text style={type.bodyMuted}>“{replying.comment}”</Text> : null}
            <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Thank them, or explain what you will fix" placeholderTextColor={colors.textFaint} multiline maxLength={300} testID="reply-text" />
            <Text style={[type.small, { textAlign: "right" }]}>{text.length}/300</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Post reply" onPress={send} loading={busy} testID="post-reply" />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setReplying(null)} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: { minHeight: 34, paddingHorizontal: 14, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, color: colors.ink },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl * 3 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: 2 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reply: { marginTop: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, gap: 2 },
  replyHead: { fontSize: 12, fontWeight: "700", color: colors.ink },
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  action: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  actionText: { fontSize: 13, color: colors.ink },
  error: { color: colors.chili, fontSize: 13, paddingHorizontal: spacing.lg },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  input: { minHeight: 90, textAlignVertical: "top", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.ink },
});
