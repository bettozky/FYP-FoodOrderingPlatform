import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { api, errorText } from "../../../shared/api/client";
import { form, LocalFile, pickDocument } from "../../../shared/util/files";
import { colors, radius, spacing, type, ui } from "../../../shared/theme/theme";
import { useAuth } from "../../auth/AuthContext";
import { DAYS, DAY_LABEL } from "../status";

const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Postgraduate", "Graduated"];
const MAX_MB = 5;

// The application form. The shop receives these answers and the attached documents in its Applicants inbox.
export default function ApplyJobScreen({ navigation, route }: any) {
  const { job } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [hours, setHours] = useState("");
  const [startDate, setStartDate] = useState("");
  const [experience, setExperience] = useState("");
  const [languages, setLanguages] = useState("");
  const [transport, setTransport] = useState(false);
  const [message, setMessage] = useState("");
  const [resume, setResume] = useState<LocalFile | null>(null);
  const [other, setOther] = useState<LocalFile | null>(null);
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const choose = async (set: (f: LocalFile | null) => void) => {
    setError("");
    try {
      const f = await pickDocument();
      if (!f) return;
      if (f.size && f.size > MAX_MB * 1024 * 1024) return setError(`That file is bigger than ${MAX_MB} MB. Choose a smaller one.`);
      set(f);
    } catch (e) {
      setError(errorText(e));
    }
  };

  const submit = async () => {
    setError("");
    if (!fullName.trim() || !phone.trim() || !email.trim()) return setError("Fill in your name, phone number and email.");
    if (!days.length) return setError("Choose the days you can work.");
    if (!resume && experience.trim().length < 10) return setError("Attach your CV, or describe your experience in a few words.");
    if (startDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) return setError("Write the start date like 2026-12-01, or leave it empty.");
    if (!eligible) return setError("Please confirm that you are allowed to work part-time.");
    setBusy(true);
    try {
      const body = await form(
        { fullName: fullName.trim(), phone: phone.trim(), email: email.trim(), institution: institution.trim(), course: course.trim(), yearOfStudy: year, availableDays: days, hoursPerWeek: hours.trim(), startDate: startDate.trim(), experience: experience.trim(), languages: languages.trim(), hasTransport: transport, message: message.trim(), eligibleToWork: true },
        { resume, other },
      );
      await api("POST", `/jobs/${job.id}/applications`, body);
      navigation.replace("MyApplications", { justApplied: true });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void, extra: object = {}) => (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={set} placeholderTextColor={colors.textFaint} accessibilityLabel={label} {...extra} />
    </View>
  );

  const docRow = (title: string, file: LocalFile | null, set: (f: LocalFile | null) => void, testID: string) => (
    <View style={styles.doc}>
      <Ionicons name={file ? "document-attach" : "document-outline"} size={22} color={colors.ink} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={type.h3}>{title}</Text>
        <Text style={type.small} numberOfLines={1}>{file ? file.name : "PDF, Word, JPG or PNG · max 5 MB"}</Text>
      </View>
      {file ? (
        <Pressable onPress={() => set(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${title}`}><Ionicons name="close-circle" size={22} color={colors.stone} /></Pressable>
      ) : (
        <Pressable onPress={() => choose(set)} style={styles.attach} accessibilityRole="button" testID={testID}><Text style={styles.attachText}>Attach</Text></Pressable>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Apply" subtitle={`${job.title} · ${job.merchantName}`} />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.section}>About you</Text>
        {field("Full name", fullName, setFullName, { testID: "apply-name" })}
        {field("Phone number", phone, setPhone, { keyboardType: "phone-pad", testID: "apply-phone" })}
        {field("Email", email, setEmail, { keyboardType: "email-address", autoCapitalize: "none" })}
        {field("University / college (optional)", institution, setInstitution)}
        {field("Course (optional)", course, setCourse)}
        <Text style={styles.label}>Year of study (optional)</Text>
        <View style={styles.wrapRow}>
          {YEARS.map((y) => (
            <Pressable key={y} onPress={() => setYear(year === y ? "" : y)} style={[ui.chip, year === y && ui.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: year === y }}>
              <Text style={[ui.chipText, year === y && ui.chipTextOn]}>{y}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>When can you work?</Text>
        <View style={styles.wrapRow}>
          {DAYS.map((d) => {
            const on = days.includes(d);
            return (
              <Pressable key={d} onPress={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])} style={[ui.chip, on && ui.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`day-${d}`}>
                <Text style={[ui.chipText, on && ui.chipTextOn]}>{DAY_LABEL[d]}</Text>
              </Pressable>
            );
          })}
        </View>
        {field("Hours you can work per week (optional)", hours, (t) => setHours(t.replace(/\D/g, "").slice(0, 2)), { keyboardType: "number-pad" })}
        {field("Earliest start date (optional, e.g. 2026-12-01)", startDate, setStartDate, { autoCapitalize: "none", maxLength: 10 })}

        <Text style={styles.section}>Your experience</Text>
        {field("Past work or skills", experience, setExperience, { multiline: true, style: [styles.input, styles.multi], maxLength: 600, testID: "apply-experience" })}
        {field("Languages you speak (optional)", languages, setLanguages)}
        <View style={styles.switchRow}>
          <Text style={[type.body, { flex: 1 }]}>I have my own transport</Text>
          <Switch value={transport} onValueChange={setTransport} />
        </View>
        {field("Message to the shop (optional)", message, setMessage, { multiline: true, style: [styles.input, styles.multi], maxLength: 500 })}

        <Text style={styles.section}>Documents</Text>
        {docRow("CV / resume", resume, setResume, "attach-resume")}
        {docRow("Another document (optional)", other, setOther, "attach-other")}
        <Text style={type.small}>Only this shop can open your documents, and the links expire after an hour.</Text>

        <Pressable style={styles.confirm} onPress={() => setEligible(!eligible)} accessibilityRole="checkbox" accessibilityState={{ checked: eligible }} testID="apply-eligible">
          <Ionicons name={eligible ? "checkbox" : "square-outline"} size={22} color={colors.turmericDeep} />
          <Text style={[type.body, { flex: 1 }]}>I confirm I am allowed to work part-time (for example, my student pass and university rules permit it).</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {busy ? <ActivityIndicator color={colors.ink} /> : <PrimaryButton label="Submit application" onPress={submit} testID="apply-submit" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm },
  section: { fontSize: 13, fontWeight: "700", color: colors.stoneText, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.lg },
  label: { fontSize: 13, color: colors.stoneText },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, color: colors.ink, backgroundColor: colors.paper },
  multi: { minHeight: 90, textAlignVertical: "top", paddingTop: spacing.sm },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  doc: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper },
  attach: { minHeight: 34, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.turmeric, justifyContent: "center" },
  attachText: { fontWeight: "700", color: colors.ink, fontSize: 13 },
  confirm: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 13.5 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg, position: "absolute", left: 0, right: 0, bottom: 0 },
});
