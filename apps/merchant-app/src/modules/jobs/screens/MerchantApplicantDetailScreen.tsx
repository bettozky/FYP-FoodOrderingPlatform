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
import { colors, radius, spacing, type } from "../../../shared/theme/theme";
import { ApplicationStatus, DAY_LABEL, fmtDate, fmtWhen, STATUS_LABEL, STATUS_TONE } from "../applicationStatus";

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
    const verb = { shortlisted: "Shortlist", hired: "Hire", rejected: "Reject" }[status];
    if (!(await confirmAsync(`${verb} ${a?.fullName}?`, "They will get a notification in their ScootMeal app.", verb))) return;
    patch({ status });
  };

  const scheduleInterview = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ivDate.trim()) || !/^\d{1,2}:\d{2}$/.test(ivTime.trim())) return setError("Write the date like 2026-11-10 and the time like 15:00.");
    const at = `${ivDate.trim()}T${ivTime.trim().padStart(5, "0")}`;
    if (await patch({ status: "interview", interview: { at, place: ivPlace.trim(), message: ivMsg.trim() } })) setIv(false);
  };

  const open = (d?: Doc) => d && Linking.openURL(d.url).catch(() => setError("Could not open the file on this device."));

  if (!a) return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Applicant" />
      {error ? <Text style={[type.body, { padding: spacing.lg, color: colors.chili }]}>{error}</Text> : <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />}
    </View>
  );

  const closed = a.status === "withdrawn";
  const row = (icon: keyof typeof Ionicons.glyphMap, label: string, value?: string) => value ? (
    <View style={styles.infoRow}><Ionicons name={icon} size={16} color={colors.stoneText} /><View style={{ flex: 1 }}><Text style={type.small}>{label}</Text><Text style={type.body}>{value}</Text></View></View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Applicant" subtitle={a.jobTitle} />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: 130 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Avatar uri={a.avatar} name={a.fullName} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{a.fullName}</Text>
            <Text style={type.small}>Applied {fmtDate(a.createdAt)}</Text>
            <View style={{ flexDirection: "row", marginTop: 4 }}><Badge label={STATUS_LABEL[a.status]} tone={STATUS_TONE[a.status]} /></View>
          </View>
        </View>

        <View style={styles.contactRow}>
          <Pressable style={styles.contact} onPress={() => Linking.openURL(`tel:${a.phone.replace(/\s/g, "")}`)} accessibilityRole="button" testID="call-applicant"><Ionicons name="call" size={16} color={colors.ink} /><Text style={styles.contactText}>Call</Text></Pressable>
          <Pressable style={styles.contact} onPress={() => Linking.openURL(`mailto:${a.email}`)} accessibilityRole="button"><Ionicons name="mail" size={16} color={colors.ink} /><Text style={styles.contactText}>Email</Text></Pressable>
        </View>

        {a.interview ? (
          <View style={styles.interview}>
            <Ionicons name="calendar" size={18} color={colors.amberText} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>Interview: {fmtWhen(a.interview.at)}</Text>
              {a.interview.place ? <Text style={type.bodyMuted}>{a.interview.place}</Text> : null}
              {a.interview.message ? <Text style={type.bodyMuted}>{a.interview.message}</Text> : null}
            </View>
          </View>
        ) : null}

        <Text style={styles.section}>Documents</Text>
        {[["CV / resume", a.documents.resume], ["Other document", a.documents.other]].map(([title, d]) => d ? (
          <Pressable key={title as string} style={styles.doc} onPress={() => open(d as Doc)} accessibilityRole="button" accessibilityLabel={`Open ${(d as Doc).name}`} testID={title === "CV / resume" ? "open-resume" : "open-other"}>
            <Ionicons name="document-attach" size={22} color={colors.ink} />
            <View style={{ flex: 1, minWidth: 0 }}><Text style={type.h3}>{title as string}</Text><Text style={type.small} numberOfLines={1}>{(d as Doc).name} · {kb((d as Doc).size)}</Text></View>
            <Text style={styles.openText}>Open</Text>
          </Pressable>
        ) : null)}
        {!a.documents.resume && !a.documents.other ? <Text style={type.bodyMuted}>No documents attached. See their experience below.</Text> : null}

        <Text style={styles.section}>About</Text>
        {row("call-outline", "Phone", a.phone)}
        {row("mail-outline", "Email", a.email)}
        {row("school-outline", "University", [a.institution, a.course, a.yearOfStudy].filter(Boolean).join(" · "))}
        {row("calendar-outline", "Can work", a.availableDays.map((d) => DAY_LABEL[d] ?? d).join(", ") + (a.hoursPerWeek ? ` · up to ${a.hoursPerWeek} h per week` : ""))}
        {row("time-outline", "Earliest start", a.startDate)}
        {row("bicycle-outline", "Own transport", a.hasTransport === undefined ? undefined : a.hasTransport ? "Yes" : "No")}
        {row("language-outline", "Languages", a.languages)}
        {row("briefcase-outline", "Experience", a.experience)}
        {row("chatbubble-outline", "Message", a.message)}
        {row("shield-checkmark-outline", "Work eligibility", "Confirmed they may work part-time")}

        <Text style={styles.section}>Your private note</Text>
        <TextInput style={styles.noteInput} value={note} onChangeText={(t) => { setNote(t); setNoteSaved(false); }} placeholder="Only you can see this" placeholderTextColor={colors.textFaint} multiline maxLength={500} testID="applicant-note" />
        <Pressable onPress={async () => setNoteSaved(await patch({ note }))} style={styles.saveNote} accessibilityRole="button"><Text style={styles.contactText}>{noteSaved ? "Saved ✓" : "Save note"}</Text></Pressable>

        <Text style={styles.section}>History</Text>
        {a.history.map((h, i) => <Text key={i} style={type.small}>• {STATUS_LABEL[h.status]} · {new Date(h.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>)}
        {error && !iv ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {closed ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}><Text style={[type.bodyMuted, { textAlign: "center" }]}>The applicant withdrew this application.</Text></View>
      ) : (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {busy ? <ActivityIndicator color={colors.ink} /> : (
            <View style={styles.actions}>
              {a.status !== "shortlisted" && a.status !== "hired" ? <Pressable style={[styles.act, styles.actAlt]} onPress={() => decide("shortlisted")} accessibilityRole="button" testID="act-shortlist"><Text style={styles.actText}>Shortlist</Text></Pressable> : null}
              <Pressable style={[styles.act, styles.actAlt]} onPress={() => { setError(""); setIv(true); }} accessibilityRole="button" testID="act-interview"><Text style={styles.actText}>Interview</Text></Pressable>
              {a.status !== "hired" ? <Pressable style={[styles.act, styles.actGo]} onPress={() => decide("hired")} accessibilityRole="button" testID="act-hire"><Text style={[styles.actText, { color: colors.white }]}>Hire</Text></Pressable> : null}
              {a.status !== "rejected" ? <Pressable style={[styles.act, styles.actNo]} onPress={() => decide("rejected")} accessibilityRole="button" testID="act-reject"><Text style={[styles.actText, { color: colors.chili }]}>Reject</Text></Pressable> : null}
            </View>
          )}
        </View>
      )}

      <Modal visible={iv} transparent animationType="fade" onRequestClose={() => setIv(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={type.h2}>Invite {a.fullName} to an interview</Text>
            <TextInput style={styles.noteInput} value={ivDate} onChangeText={setIvDate} placeholder="Date, e.g. 2026-11-10" placeholderTextColor={colors.textFaint} autoCapitalize="none" maxLength={10} testID="iv-date" />
            <TextInput style={styles.noteInput} value={ivTime} onChangeText={setIvTime} placeholder="Time, e.g. 15:00" placeholderTextColor={colors.textFaint} autoCapitalize="none" maxLength={5} testID="iv-time" />
            <TextInput style={styles.noteInput} value={ivPlace} onChangeText={setIvPlace} placeholder="Where? e.g. Our stall, Canteen A" placeholderTextColor={colors.textFaint} maxLength={120} testID="iv-place" />
            <TextInput style={[styles.noteInput, { minHeight: 70 }]} value={ivMsg} onChangeText={setIvMsg} placeholder="Message (optional)" placeholderTextColor={colors.textFaint} multiline maxLength={300} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Send invitation" onPress={scheduleInterview} loading={busy} testID="iv-send" />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setIv(false)} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm },
  top: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  contactRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  contact: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  contactText: { fontSize: 13.5, fontWeight: "700", color: colors.ink },
  section: { fontSize: 13, fontWeight: "700", color: colors.stoneText, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg },
  infoRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  doc: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  openText: { fontWeight: "700", color: colors.turmericDeep },
  interview: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.amberTint, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  noteInput: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.ink, backgroundColor: colors.surface },
  saveNote: { alignSelf: "flex-start", minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.chili, fontSize: 13.5 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  actions: { flexDirection: "row", gap: spacing.sm },
  act: { flex: 1, minHeight: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  actAlt: { borderColor: colors.border, backgroundColor: colors.surface },
  actGo: { borderColor: colors.herb, backgroundColor: colors.herb },
  actNo: { borderColor: colors.chiliBorder, backgroundColor: colors.chiliSoft },
  actText: { fontWeight: "700", fontSize: 13.5, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
});
