import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Badge from "../../shared/components/Badge";
import EmptyState from "../../shared/components/EmptyState";
import PrimaryButton from "../../shared/components/PrimaryButton";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { api, errorText } from "../../shared/api/client";
import { confirmAsync } from "../../shared/util/confirm";
import { colors, radius, spacing, type, font } from "../../shared/theme/theme";
import i18n, { locale } from "../../shared/i18n";
import { useTranslation } from "react-i18next";

type Item = { id: string; title: string; body: string; pinned: boolean; createdAt: number; expiresAt?: number; expired?: boolean };
const DURATIONS: { days: number; label: string }[] = [
  { days: 3, get label() { return i18n.t("ann.days3"); } },
  { days: 7, get label() { return i18n.t("ann.week1"); } },
  { days: 30, get label() { return i18n.t("ann.month1"); } },
  { days: 0, get label() { return i18n.t("ann.noEnd"); } },
];

// Notices from the shop (a promo, a holiday closure, new menu). They appear on every customer's Announcements page.
export default function MerchantAnnouncementsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ announcements: Item[] }>("GET", "/merchant/announcements")).announcements);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => { setEditing("new"); setTitle(""); setBody(""); setPinned(false); setDays(7); setError(""); };
  const openEdit = (a: Item) => { setEditing(a); setTitle(a.title); setBody(a.body); setPinned(a.pinned); setDays(-1); setError(""); };

  const save = async () => {
    if (!title.trim() || !body.trim()) return setError(t("ann.needText"));
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { title: title.trim(), body: body.trim(), pinned };
      if (days >= 0) payload.expiresInDays = days; // -1 = leave the end date as it was
      if (editing === "new") await api("POST", "/merchant/announcements", payload);
      else if (editing) await api("PATCH", `/merchant/announcements/${editing.id}`, payload);
      setEditing(null);
      load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: Item) => {
    if (!(await confirmAsync(t("ann.deleteTitle"), t("ann.deleteBody"), t("common.delete")))) return;
    try { await api("DELETE", `/merchant/announcements/${a.id}`); load(); } catch (e) { setError(errorText(e)); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("drawer.announcements")} subtitle={t("ann.subtitle")} />
      {error && !editing ? <Text style={{ color: colors.chiliText, paddingHorizontal: spacing.lg }}>{error}</Text> : null}
      {!items && !error ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <FlatList
          data={items ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 2 }}
          ListHeaderComponent={<PrimaryButton label={`+ ${t("ann.new")}`} onPress={openNew} testID="new-announcement" />}
          ListEmptyComponent={<EmptyState icon="megaphone-outline" title={t("ann.empty")} hint={t("ann.emptyHint")} />}
          renderItem={({ item: a }) => (
            <View style={[styles.card, a.expired && { opacity: 0.6 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={[type.h3, { flexShrink: 1 }]}>{a.title}</Text>
                {a.pinned ? <Badge label={t("ann.pinned")} tone="warning" /> : null}
                {a.expired ? <Badge label={t("ann.ended")} tone="neutral" /> : null}
              </View>
              <Text style={type.body}>{a.body}</Text>
              <Text style={type.small}>{t("ann.posted", { date: new Date(a.createdAt).toLocaleDateString(locale()) })} · {a.expiresAt ? t("ann.ends", { date: new Date(a.expiresAt).toLocaleDateString(locale()) }) : t("ann.noEndDate")}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.act} onPress={() => openEdit(a)} accessibilityRole="button" accessibilityLabel={t("ann.editA11y", { title: a.title })}><Ionicons name="create-outline" size={16} color={colors.ink} /><Text style={styles.actText}>{t("common.edit")}</Text></Pressable>
                <Pressable style={[styles.act, { borderColor: colors.chiliBorder }]} onPress={() => remove(a)} accessibilityRole="button" accessibilityLabel={t("ann.deleteA11y", { title: a.title })}><Ionicons name="trash-outline" size={16} color={colors.chili} /><Text style={[styles.actText, { color: colors.chili }]}>{t("common.delete")}</Text></Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={type.h2}>{editing === "new" ? t("ann.new") : t("ann.edit")}</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t("ann.titlePh")} placeholderTextColor={colors.textFaint} maxLength={80} testID="ann-title" />
            <TextInput style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]} value={body} onChangeText={setBody} placeholder={t("ann.message")} placeholderTextColor={colors.textFaint} multiline maxLength={600} testID="ann-body" />
            <View style={styles.switchRow}><Text style={type.body}>{t("ann.pin")}</Text><Switch value={pinned} onValueChange={setPinned} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={pinned ? colors.primary : colors.textFaint} /></View>
            <Text style={type.small}>{t("ann.showFor")}</Text>
            <View style={styles.chips}>
              {editing !== "new" ? (
                <Pressable style={[styles.chip, days === -1 && styles.chipOn]} onPress={() => setDays(-1)}><Text style={[styles.chipText, days === -1 && { color: colors.white }]}>{t("ann.keep")}</Text></Pressable>
              ) : null}
              {DURATIONS.map((d) => (
                <Pressable key={d.days} style={[styles.chip, days === d.days && styles.chipOn]} onPress={() => setDays(d.days)} accessibilityRole="radio" accessibilityState={{ selected: days === d.days }}>
                  <Text style={[styles.chipText, days === d.days && { color: colors.white }]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
            {error ? <Text style={{ color: colors.chiliText, fontSize: 14 }}>{error}</Text> : null}
            <PrimaryButton label={editing === "new" ? t("ann.post") : t("ann.saveChanges")} onPress={save} loading={busy} testID="ann-save" />
            <PrimaryButton label={t("common.cancel")} variant="outline" onPress={() => setEditing(null)} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 6 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  act: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  actText: { fontWeight: "700", fontSize: 13, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.ink, backgroundColor: colors.bg },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { minHeight: 34, paddingHorizontal: 14, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, color: colors.ink },
});
