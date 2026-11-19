// Opening hours on the merchant dashboard: a different time for each day, or closed (same as sign-up step 5).
// Folded by default to a short summary ("Mon–Fri 09:00–21:00 · Sun Closed") so it does not fill the screen;
// tap the header to show the 7 day rows. Saves with PATCH /merchant/me { weeklyHours } (0 = Sunday, closed days left out).
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../../shared/api/client";
import type { MerchantProfile } from "../../../shared/api/types";
import { colors, fonts, radius, shadow, spacing } from "../../../shared/theme/theme";
import { DAYS, DayHours, DayKey } from "../../onboarding/signup/types";

const DAY_NUMBER: Record<DayKey, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The shop's hours as 7 rows, Monday first. Without per-day hours, the one open/close pair applies every day. */
function rowsFrom(p: MerchantProfile): DayHours[] {
  return DAYS.map(({ key }) => {
    if (!p.weeklyHours?.length) return { day: key, open: p.hours.open, close: p.hours.close, closed: false };
    const h = p.weeklyHours.find((x) => x.day === DAY_NUMBER[key]);
    return h ? { day: key, open: h.open, close: h.close, closed: false } : { day: key, open: "09:00", close: "21:00", closed: true };
  });
}

/** "9" -> "09:00", "930" -> "09:30", "9.30" -> "09:30". Anything else is left for the check to flag. */
function tidyTime(v: string): string {
  const t = v.trim().replace(/[.\s]/g, ":");
  let m = t.match(/^(\d{1,2})$/);
  if (m) return `${m[1]!.padStart(2, "0")}:00`;
  m = t.match(/^(\d{1,2}):?(\d{2})$/);
  return m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : t;
}

/** Consecutive days with the same hours become one line: "Mon–Fri 09:00–21:00". */
function summary(rows: DayHours[]): string[] {
  const label = (h: DayHours) => (h.closed ? "Closed" : `${h.open}–${h.close}`);
  const out: string[] = [];
  let start = 0;
  rows.forEach((h, i) => {
    const next = rows[i + 1];
    if (next && label(next) === label(h)) return;
    const a = DAYS[start]!.label.slice(0, 3), b = DAYS[i]!.label.slice(0, 3);
    out.push(`${start === i ? a : `${a}–${b}`}  ${label(h)}`);
    start = i + 1;
  });
  return out.length === 1 && !rows[0]!.closed ? [`Every day  ${label(rows[0]!)}`] : out;
}

function check(rows: DayHours[]): { errors: Record<string, string>; message: string } {
  const errors: Record<string, string> = {};
  for (const h of rows) {
    if (h.closed) continue;
    const name = DAYS.find((d) => d.key === h.day)!.label;
    if (!TIME.test(h.open) || !TIME.test(h.close)) errors[h.day] = `${name}: use 24-hour times like 09:00 and 21:30.`;
    else if (h.open === h.close) errors[h.day] = `${name}: opening and closing time cannot be the same.`;
  }
  const first = Object.values(errors)[0];
  if (first) return { errors, message: first };
  if (rows.every((h) => h.closed)) return { errors, message: "Open at least one day. To close for a while, set Store status to Offline." };
  return { errors, message: "" };
}

export default function OpeningHoursCard({ profile, onSaved }: { profile: MerchantProfile | null; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<DayHours[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Follow the server, but never overwrite changes the merchant is still typing (the dashboard refreshes every few seconds).
  const serverKey = profile ? JSON.stringify([profile.hours, profile.weeklyHours ?? null]) : "";
  useEffect(() => {
    if (profile && !dirty) setRows(rowsFrom(profile));
  }, [serverKey, dirty]);

  if (!rows) return null;

  const setDay = (i: number, patch: Partial<DayHours>) => {
    setRows((cur) => cur!.map((h, j) => (j === i ? { ...h, ...patch } : h)));
    setDirty(true);
    setMsg(null);
    setErrors((e) => { const n = { ...e }; delete n[rows[i]!.day]; return n; });
  };
  const copyMonday = () => {
    const m = rows[0]!;
    setRows(rows.map((h) => ({ ...h, open: m.open, close: m.close, closed: m.closed })));
    setDirty(true);
    setErrors({});
    setMsg(null);
  };
  const discard = () => {
    if (profile) setRows(rowsFrom(profile));
    setDirty(false);
    setErrors({});
    setMsg(null);
  };
  const save = async () => {
    const tidy = rows.map((h) => ({ ...h, open: tidyTime(h.open), close: tidyTime(h.close) }));
    setRows(tidy);
    const c = check(tidy);
    setErrors(c.errors);
    if (c.message) return setMsg({ text: c.message, bad: true });
    setBusy(true);
    try {
      await api("PATCH", "/merchant/me", { weeklyHours: tidy.filter((h) => !h.closed).map((h) => ({ day: DAY_NUMBER[h.day], open: h.open, close: h.close })) });
      setDirty(false);
      setExpanded(false); // fold it away again once saved
      setMsg({ text: "Saved. Customers see open or closed based on these hours.", bad: false });
      onSaved();
    } catch (e) {
      setMsg({ text: errorText(e), bad: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.card} testID="hours-card">
      <Pressable
        style={s.head}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Opening hours, ${expanded ? "hide" : "show and edit"}`}
        testID="hours-toggle"
      >
        <Text style={s.title}>Opening hours</Text>
        <Text style={[s.pill, { color: profile?.openNow ? colors.herb : colors.chili, backgroundColor: profile?.openNow ? colors.herbLight : colors.chiliSoft }]}>
          {profile?.openNow ? "Open now" : "Closed now"}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={s.toggleText}>{expanded ? "Hide" : "Edit"}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.ink} />
      </Pressable>

      {!expanded ? (
        <Pressable onPress={() => setExpanded(true)} accessibilityRole="button" accessibilityLabel="Edit opening hours" testID="hours-summary">
          {summary(rows).map((line) => <Text key={line} style={s.summary}>{line}</Text>)}
          {dirty ? <Text style={[s.hint, { color: colors.amberText }]}>You have unsaved changes. Tap to finish.</Text> : null}
        </Pressable>
      ) : (
        <>
          <View style={s.rowBetween}>
            <Text style={s.hint}>Turn a day off to close that day.</Text>
            <Pressable onPress={copyMonday} hitSlop={8} accessibilityRole="button" testID="hours-copy">
              <Text style={s.link}>Copy Monday to all</Text>
            </Pressable>
          </View>
          <View style={s.days}>
            {rows.map((h, i) => {
              const name = DAYS[i]!.label;
              const bad = !!errors[h.day];
              return (
                <View key={h.day} style={[s.dayRow, i > 0 && s.dayLine]}>
                  <Text style={[s.dayLabel, h.closed && { color: colors.stone }]}>{name.slice(0, 3)}</Text>
                  {h.closed ? (
                    <Text style={[s.closed, { flex: 1 }]}>Closed</Text>
                  ) : (
                    <View style={s.times}>
                      <TextInput style={[s.time, bad && s.timeBad]} value={h.open} onChangeText={(v) => setDay(i, { open: v })} onBlur={() => tidyTime(h.open) !== h.open && setDay(i, { open: tidyTime(h.open) })}
                        placeholder="09:00" placeholderTextColor={colors.textFaint} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel={`${name} opens`} testID={`hours-open-${h.day}`} />
                      <Text style={s.closed}>–</Text>
                      <TextInput style={[s.time, bad && s.timeBad]} value={h.close} onChangeText={(v) => setDay(i, { close: v })} onBlur={() => tidyTime(h.close) !== h.close && setDay(i, { close: tidyTime(h.close) })}
                        placeholder="21:00" placeholderTextColor={colors.textFaint} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel={`${name} closes`} testID={`hours-close-${h.day}`} />
                    </View>
                  )}
                  <Switch value={!h.closed} onValueChange={(on) => setDay(i, { closed: !on })} trackColor={{ false: colors.stoneLine, true: colors.herb }} thumbColor={colors.white}
                    accessibilityLabel={`Open on ${name}`} testID={`hours-day-${h.day}`} />
                </View>
              );
            })}
          </View>
          <Text style={s.hint}>Closing after midnight is fine, e.g. 18:00 – 02:00.</Text>
          <View style={s.actions}>
            {dirty ? (
              <Pressable style={s.ghostBtn} onPress={discard} disabled={busy} accessibilityRole="button" testID="hours-discard">
                <Text style={s.ghostText}>Discard</Text>
              </Pressable>
            ) : null}
            <Pressable style={[s.saveBtn, (!dirty || busy) && { opacity: 0.5 }]} onPress={save} disabled={!dirty || busy} accessibilityRole="button" accessibilityState={{ disabled: !dirty || busy, busy }} testID="hours-save">
              <Text style={s.saveText}>{busy ? "Saving…" : "Save hours"}</Text>
            </Pressable>
          </View>
        </>
      )}
      {msg ? <Text style={[s.hint, msg.bad && { color: colors.chiliText }]} accessibilityLiveRegion="polite" testID="hours-msg">{msg.text}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md, ...shadow.soft },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 32 },
  title: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.ink },
  pill: { fontSize: 11.5, fontFamily: fonts.displayBold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden" },
  toggleText: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.ink },
  summary: { fontSize: 14, fontFamily: fonts.serifMedium, color: colors.text, lineHeight: 22 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  link: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.amberText },
  days: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md },
  dayRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 50 },
  dayLine: { borderTopWidth: 1, borderTopColor: colors.stoneLine },
  dayLabel: { width: 40, fontSize: 14, fontFamily: fonts.displayBold, color: colors.ink },
  times: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  time: { width: 64, textAlign: "center", borderWidth: 1, borderColor: colors.stone, borderRadius: radius.sm, paddingVertical: 6, fontFamily: fonts.serifMedium, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  timeBad: { borderColor: colors.chili, borderWidth: 1.5 },
  closed: { fontSize: 14, fontFamily: fonts.serif, color: colors.stone },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  ghostBtn: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 9 },
  ghostText: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.ink },
  saveBtn: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  saveText: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.white },
  hint: { fontSize: 12, fontFamily: fonts.serif, color: colors.stone },
});
