import React, { useCallback, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../../../shared/components/Avatar";
import Badge from "../../../shared/components/Badge";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { api, errorText } from "../../../shared/api/client";
import { confirmAsync } from "../../../shared/util/confirm";
import { colors, radius, spacing, type, font, layout } from "../../../shared/theme/theme";
import { ApplicationStatus, DAY_LABEL, fmtDate, fmtWhen, STATUS_LABEL, STATUS_TONE } from "../applicationStatus";
import { locale } from "../../../shared/i18n";
import { useTranslation } from "react-i18next";

type Doc = { name: string; size: number; mimeType: string; url: string };
type App = {
  id: string; jobTitle: string; fullName: string; email: string; phone: string; institution?: string; course?: string; yearOfStudy?: string;
  availableDays: string[]; hoursPerWeek?: number; startDate?: string; experience?: string; languages?: string; hasTransport?: boolean; message?: string; avatar?: string;
  documents: { resume?: Doc; other?: Doc }; status: ApplicationStatus; history: { status: ApplicationStatus; at: number }[]; note?: string;
  interview?: { at: string; place?: string; message?: string }; createdAt: number;
};

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// One applicant: their answers, CV and documents (tap to open), and the buttons that move them along:
// shortlist, schedule an interview, hire or reject. The applicant gets a notification for each change.
export default function MerchantApplicantDetailScreen({ route }: any) {
  const { applicationId } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [a, setA] = useState<App | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [iv, setIv] = useState(false);
  const [ivDate, setIvDate] = useState("");
  const [ivTime, setIvTime] = useState("");
  const [ivPlace, setIvPlace] = useState("");
  const [ivMsg, setIvMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<{ application: App }>("GET", `/merchant/applications/${applicationId}`);
      setA(r.application);
      setNote(r.application.note ?? "");
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, [applicationId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patch = async (body: object) => {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ application: App }>("PATCH", `/merchant/applications/${applicationId}`, body);
      setA(r.application);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const decide = async (status: "shortlisted" | "hired" | "rejected") => {
    const verb = { shortlisted: t("applicant.shortlist"), hired: t("applicant.hire"), rejected: t("applicant.reject") }[status];
    const ask = { shortlisted: t("applicant.askShortlist", { name: a?.fullName ?? "" }), hired: t("applicant.askHire", { name: a?.fullName ?? "" }), rejected: t("applicant.askReject", { name: a?.fullName ?? "" }) }[status];
    if (!(await confirmAsync(ask, t("applicant.notified"), verb))) return;
    patch({ status });
  };

  const scheduleInterview = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ivDate.trim()) || !/^\d{1,2}:\d{2}$/.test(ivTime.trim())) return setError(t("applicant.badDate"));
    const at = `${ivDate.trim()}T${ivTime.trim().padStart(5, "0")}`;
    if (await patch({ status: "interview", interview: { at, place: ivPlace.trim(), message: ivMsg.trim() } })) setIv(false);
  };

  const open = (d?: Doc) => d && Linking.openURL(d.url).catch(() => setError(t("applicant.cantOpen")));

  if (!a) return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("applicant.title")} />
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chili }]}>{error}</Text> : <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />}
    </View>
  );

  const closed = a.status === "withdrawn";
  const row = (icon: keyof typeof Ionicons.glyphMap, label: string, value?: string) => value ? (
    <View style={styles.infoRow}><Ionicons name={icon} size={16} color={colors.stoneText} /><View style={{ flex: 1 }}><Text style={type.small}>{label}</Text><Text style={type.body}>{value}</Text></View></View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("applicant.title")} subtitle={a.jobTitle} />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: 130 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Avatar uri={a.avatar} name={a.fullName} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{a.fullName}</Text>
            <Text style={type.small}>{t("applicant.applied", { date: fmtDate(a.createdAt) })}</Text>
            <View style={{ flexDirection: "row", marginTop: 4 }}><Badge label={STATUS_LABEL[a.status]} tone={STATUS_TONE[a.status]} /></View>
          </View>
        </View>

        <View style={styles.contactRow}>
          <Pressable style={styles.contact} onPress={() => Linking.openURL(`tel:${a.phone.replace(/\s/g, "")}`)} accessibilityRole="button" testID="call-applicant"><Ionicons name="call" size={16} color={colors.ink} /><Text style={styles.contactText}>{t("chat.call")}</Text></Pressable>
          <Pressable style={styles.contact} onPress={() => Linking.openURL(`mailto:${a.email}`)} accessibilityRole="button"><Ionicons name="mail" size={16} color={colors.ink} /><Text style={styles.contactText}>{t("auth.email")}</Text></Pressable>
        </View>

        {a.interview ? (
          <View style={styles.interview}>
            <Ionicons name="calendar" size={18} color={colors.amberText} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{t("applicant.interviewAt", { when: fmtWhen(a.interview.at) })}</Text>
              {a.interview.place ? <Text style={type.bodyMuted}>{a.interview.place}</Text> : null}
              {a.interview.message ? <Text style={type.bodyMuted}>{a.interview.message}</Text> : null}
            </View>
          </View>
        ) : null}

        <Text style={styles.section}>{t("applicant.documents")}</Text>
        {([["resume", t("applicant.cv"), a.documents.resume], ["other", t("applicant.otherDoc"), a.documents.other]] as const).map(([kind, title, d]) => d ? (
          <Pressable key={kind} style={styles.doc} onPress={() => open(d as Doc)} accessibilityRole="button" accessibilityLabel={t("applicant.openFile", { name: (d as Doc).name })} testID={kind === "resume" ? "open-resume" : "open-other"}>
            <Ionicons name="document-attach" size={22} color={colors.ink} />
            <View style={{ flex: 1, minWidth: 0 }}><Text style={type.h3}>{title as string}</Text><Text style={type.small} numberOfLines={1}>{(d as Doc).name} · {kb((d as Doc).size)}</Text></View>
            <Text style={styles.openText}>{t("applicant.open")}</Text>
          </Pressable>
        ) : null)}
        {!a.documents.resume && !a.documents.other ? <Text style={type.bodyMuted}>{t("applicant.noDocs")}</Text> : null}

        <Text style={styles.section}>{t("applicant.about")}</Text>
        {row("call-outline", t("applicant.phone"), a.phone)}
        {row("mail-outline", t("auth.email"), a.email)}
        {row("school-outline", t("applicant.university"), [a.institution, a.course, a.yearOfStudy].filter(Boolean).join(" · "))}
        {row("calendar-outline", t("applicant.canWork"), a.availableDays.map((d) => DAY_LABEL[d] ?? d).join(t("common.listSep")) + (a.hoursPerWeek ? ` · ${t("applicant.upTo", { n: a.hoursPerWeek })}` : ""))}
        {row("time-outline", t("applicant.start"), a.startDate)}
        {row("bicycle-outline", t("applicant.transport"), a.hasTransport === undefined ? undefined : a.hasTransport ? t("common.yes") : t("applicant.no"))}
        {row("language-outline", t("applicant.languages"), a.languages)}
        {row("briefcase-outline", t("applicant.experience"), a.experience)}
        {row("chatbubble-outline", t("ann.message"), a.message)}
        {row("shield-checkmark-outline", t("applicant.eligibility"), t("applicant.eligibilityYes"))}

        <Text style={styles.section}>{t("applicant.note")}</Text>
        <TextInput style={styles.noteInput} value={note} onChangeText={(v) => { setNote(v); setNoteSaved(false); }} placeholder={t("applicant.notePh")} placeholderTextColor={colors.textFaint} multiline maxLength={500} testID="applicant-note" />
        <Pressable onPress={async () => setNoteSaved(await patch({ note }))} style={styles.saveNote} accessibilityRole="button"><Text style={styles.contactText}>{noteSaved ? t("applicant.noteSaved") : t("applicant.saveNote")}</Text></Pressable>

        <Text style={styles.section}>{t("orders.history")}</Text>
        {a.history.map((h, i) => <Text key={i} style={type.small}>• {STATUS_LABEL[h.status]} · {new Date(h.at).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>)}
        {error && !iv ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {closed ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}><Text style={[type.bodyMuted, { textAlign: "center" }]}>{t("applicant.withdrew")}</Text></View>
      ) : (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {busy ? <ActivityIndicator color={colors.ink} /> : (
            <View style={styles.actions}>
              {a.status !== "shortlisted" && a.status !== "hired" ? <Pressable style={[styles.act, styles.actAlt]} onPress={() => decide("shortlisted")} accessibilityRole="button" testID="act-shortlist"><Text style={styles.actText}>{t("applicant.shortlist")}</Text></Pressable> : null}
              <Pressable style={[styles.act, styles.actAlt]} onPress={() => { setError(""); setIv(true); }} accessibilityRole="button" testID="act-interview"><Text style={styles.actText}>{t("jobs.stInterview")}</Text></Pressable>
              {a.status !== "hired" ? <Pressable style={[styles.act, styles.actGo]} onPress={() => decide("hired")} accessibilityRole="button" testID="act-hire"><Text style={[styles.actText, { color: colors.white }]}>{t("applicant.hire")}</Text></Pressable> : null}
              {a.status !== "rejected" ? <Pressable style={[styles.act, styles.actNo]} onPress={() => decide("rejected")} accessibilityRole="button" testID="act-reject"><Text style={[styles.actText, { color: colors.chiliText }]}>{t("applicant.reject")}</Text></Pressable> : null}
            </View>
          )}
        </View>
      )}

      <Modal visible={iv} transparent animationType="fade" onRequestClose={() => setIv(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={type.h2}>{t("applicant.invite", { name: a.fullName })}</Text>
            <TextInput style={styles.noteInput} value={ivDate} onChangeText={setIvDate} placeholder={t("applicant.datePh")} placeholderTextColor={colors.textFaint} autoCapitalize="none" maxLength={10} testID="iv-date" />
            <TextInput style={styles.noteInput} value={ivTime} onChangeText={setIvTime} placeholder={t("applicant.timePh")} placeholderTextColor={colors.textFaint} autoCapitalize="none" maxLength={5} testID="iv-time" />
            <TextInput style={styles.noteInput} value={ivPlace} onChangeText={setIvPlace} placeholder={t("applicant.placePh")} placeholderTextColor={colors.textFaint} maxLength={120} testID="iv-place" />
            <TextInput style={[styles.noteInput, { minHeight: 70 }]} value={ivMsg} onChangeText={setIvMsg} placeholder={t("applicant.msgPh")} placeholderTextColor={colors.textFaint} multiline maxLength={300} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={t("applicant.send")} onPress={scheduleInterview} loading={busy} testID="iv-send" />
            <PrimaryButton label={t("common.cancel")} variant="outline" onPress={() => setIv(false)} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingVertical: spacing.md, gap: spacing.sm },
  top: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  contactRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  contact: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  contactText: { fontSize: 14, fontWeight: "700", color: colors.ink },
  section: { fontSize: 13, fontWeight: "700", color: colors.stoneText, marginTop: spacing.lg },
  infoRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  doc: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  openText: { fontWeight: "700", color: colors.amberText },
  interview: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.amberTint, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  noteInput: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.ink, backgroundColor: colors.surface },
  saveNote: { alignSelf: "flex-start", minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.chiliText, fontSize: 14 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft, backgroundColor: colors.bg },
  actions: { flexDirection: "row", gap: spacing.sm },
  act: { flex: 1, minHeight: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  actAlt: { borderColor: colors.border, backgroundColor: colors.surface },
  actGo: { borderColor: colors.herb, backgroundColor: colors.herb },
  actNo: { borderColor: colors.chiliBorder, backgroundColor: colors.chiliSoft },
  actText: { fontWeight: "700", fontSize: 14, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
});
