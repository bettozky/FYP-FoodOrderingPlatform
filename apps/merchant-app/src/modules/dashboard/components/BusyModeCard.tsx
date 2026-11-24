// Sprint 3 "busy mode / auto-pause" on the merchant dashboard.
// Pick a wait limit and what happens when the live wait goes past it:
//   Warn customers: they see "Very busy, about 32 min" and must tick "I'm OK waiting" to order;
//   Pause orders:   new orders stop until the queue is back under the limit, then start again by themselves.
// GET / PUT /merchant/busy-mode. The live wait is refreshed every 10 seconds.
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../../shared/api/client";
import { colors, radius, shadow, spacing, font } from "../../../shared/theme/theme";
import { useTranslation } from "react-i18next";

type BusyMode = { on: boolean; limitMinutes: number; action: "warn" | "pause" };
type BusyReply = { busyMode: BusyMode; waitMinutes: number; queue: number; ordersPaused: boolean; longWaitWarning: boolean };

const LIMITS = [15, 20, 30, 45];

export default function BusyModeCard() {
  const { t } = useTranslation();
  const [data, setData] = useState<BusyReply | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = () => api<BusyReply>("GET", "/merchant/busy-mode").then(setData).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  async function save(next: Partial<BusyMode>) {
    if (!data) return;
    const busyMode = { ...data.busyMode, ...next };
    setData({ ...data, busyMode }); // show the change straight away
    setSaving(true);
    setError("");
    try {
      setData(await api<BusyReply>("PUT", "/merchant/busy-mode", busyMode));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  if (!data) return null;
  const { busyMode: mode, waitMinutes, queue } = data;
  const percent = Math.min(100, Math.round((waitMinutes / mode.limitMinutes) * 100));
  const over = waitMinutes > mode.limitMinutes;
  const barColour = !mode.on ? colors.stone : over ? colors.chili : percent >= 80 ? colors.turmeric : colors.herb;

  return (
    <View style={styles.card} testID="busy-mode-card">
      <View style={styles.head}>
        <Ionicons name="flame" size={20} color={over && mode.on ? colors.chili : colors.turmeric} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t("busy.title")}</Text>
          <Text style={styles.hint}>{t("busy.intro")}</Text>
        </View>
        <Switch value={mode.on} onValueChange={(on) => save({ on })} disabled={saving} trackColor={{ true: colors.herb, false: colors.stoneLine }} accessibilityLabel={t("busy.title")} testID="busy-mode-switch" />
      </View>

      {/* live wait against the limit */}
      <View style={styles.liveRow}>
        <Text style={styles.liveBig}>{t("busy.min", { n: waitMinutes })}</Text>
        <Text style={styles.hint}>{t("busy.waitNow", { count: queue })}{mode.on ? ` · ${t("busy.limit", { n: mode.limitMinutes })}` : ""}</Text>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
        <View style={[styles.fill, { width: `${percent}%` as `${number}%`, backgroundColor: barColour }]} />
      </View>

      {mode.on ? (
        <>
          <Text style={styles.label}>{t("busy.whenOver")}</Text>
          <View style={styles.chips}>
            {LIMITS.map((l) => (
              <Pressable key={l} onPress={() => save({ limitMinutes: l })} style={[styles.chip, mode.limitMinutes === l && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: mode.limitMinutes === l }} testID={`busy-limit-${l}`}>
                <Text style={[styles.chipText, mode.limitMinutes === l && styles.chipTextOn]}>{t("busy.min", { n: l })}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            {(["warn", "pause"] as const).map((a) => {
              const on = mode.action === a;
              return (
                <Pressable key={a} onPress={() => save({ action: a })} style={[styles.action, on && styles.actionOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} testID={`busy-action-${a}`}>
                  <Ionicons name={a === "warn" ? "alert-circle-outline" : "pause-circle-outline"} size={18} color={on ? colors.ink : colors.stone} />
                  <Text style={[styles.actionTitle, !on && { color: colors.stoneText }]}>{a === "warn" ? t("busy.warn") : t("busy.pause")}</Text>
                  <Text style={styles.actionHint}>{a === "warn" ? t("busy.warnHint") : t("busy.pauseHint")}</Text>
                </Pressable>
              );
            })}
          </View>
          {over ? (
            <View style={[styles.banner, mode.action === "pause" ? styles.bannerRed : styles.bannerAmber]} testID="busy-active">
              <Ionicons name={mode.action === "pause" ? "pause-circle" : "alert-circle"} size={16} color={mode.action === "pause" ? colors.chiliText : colors.amberText} />
              <Text style={[styles.bannerText, { color: mode.action === "pause" ? colors.chiliText : colors.amberText }]}>
                {mode.action === "pause" ? t("busy.pausedNow") : t("busy.warningNow")}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
      {error ? <Text style={[styles.hint, { color: colors.chiliText }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md, ...shadow.soft },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { fontSize: 15, ...font.displayBold, color: colors.ink },
  hint: { fontSize: 12, ...font.display, color: colors.stoneText },
  liveRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  liveBig: { fontSize: 24, ...font.displayExtraBold, color: colors.ink },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.paperDim, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5 },
  label: { fontSize: 12, ...font.displayBold, color: colors.stoneText },
  chips: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...font.display, fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.white, ...font.displayBold },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md, gap: 4 },
  actionOn: { borderColor: colors.ink, backgroundColor: colors.paperDim },
  actionTitle: { fontSize: 14, ...font.displayBold, color: colors.ink },
  actionHint: { fontSize: 12, ...font.display, color: colors.stoneText },
  banner: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", borderRadius: radius.sm, padding: spacing.md, borderWidth: 1 },
  bannerRed: { backgroundColor: colors.chiliSoft, borderColor: colors.chiliBorder },
  bannerAmber: { backgroundColor: colors.amberTint, borderColor: colors.amberBorder },
  bannerText: { flex: 1, fontSize: 13, ...font.display },
});
