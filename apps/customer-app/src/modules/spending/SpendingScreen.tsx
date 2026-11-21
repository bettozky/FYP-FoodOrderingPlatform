import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../shared/components/ScreenHeader";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { errorText } from "../../shared/api/client";
import { rm } from "../../shared/util/format";
import { useReducedMotion } from "../../shared/motion/useReducedMotion";
import { colors, fonts, radius, spacing, type, ui } from "../../shared/theme/theme";
import { useLive } from "../ordering/LiveDataContext";
import { budgetState, spendingSummary, type BudgetState } from "./spending";
import { useBudget } from "./useBudget";
import { useTranslation } from "react-i18next";

// Sprint 3 "spending tracker and weekly budget". Route: navigation.navigate("Spending") (Account → Spending & budget).
// This week's spending against an optional weekly budget, the last 8 weeks as bars, this week day by day,
// and where the money went this month. Checkout warns before an order goes over the budget.
const QUICK = [30, 50, 80, 100];
// spending.ts keeps English labels (a backend test checks them); the screen shows them in the app's language.
const DAY_KEYS = ["spending.mon", "spending.tue", "spending.wed", "spending.thu", "spending.fri", "spending.sat", "spending.sun"] as const;

export const BUDGET_COLOUR: Record<BudgetState["level"], string> = { none: colors.ink, ok: colors.herb, near: colors.turmeric, over: colors.chili };

export default function SpendingScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { orders } = useLive();
  const { budget, save } = useBudget();
  const s = useMemo(() => spendingSummary(orders), [orders]);
  const state = budgetState(s.thisWeek, budget);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setTo(v: number | null) {
    setBusy(true);
    setError("");
    try {
      await save(v);
      setEditing(false);
      setText("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const maxWeek = Math.max(1, budget ?? 0, ...s.weeks.map((w) => w.total));
  const maxDay = Math.max(1, ...s.days.map((d) => d.total));
  const weekLabel = (label: string, i: number) => (i === s.weeks.length - 1 ? t("spending.thisWk") : label);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("menu.spending")} subtitle={t("spending.subtitle")} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {/* This week vs budget */}
        <View style={styles.hero} testID="spending-hero">
          <Text style={styles.heroLabel}>{t("spending.spentThisWeek")}</Text>
          <Text style={styles.heroAmount} testID="spending-week">{rm(s.thisWeek)}</Text>
          {state.level === "none" ? (
            <Text style={styles.heroSub}>{t("spending.noBudget")}</Text>
          ) : (
            <>
              <ProgressBar percent={state.percent} color={BUDGET_COLOUR[state.level]} />
              <Text style={[styles.heroSub, state.level === "over" && { color: colors.chiliSoft }]} testID="spending-left">
                {state.level === "over"
                  ? t("spending.overBy", { amount: rm(-state.left), budget: rm(budget!) })
                  : t("spending.left", { amount: rm(state.left), budget: rm(budget!), percent: state.percent })}
              </Text>
            </>
          )}
          <View style={styles.heroStats}>
            <Stat label={t("spending.thisMonth")} value={rm(s.thisMonth)} />
            <Stat label={t("tabs.orders")} value={String(s.orderCount)} />
            <Stat label={t("spending.average")} value={rm(s.average)} />
          </View>
        </View>

        {/* Budget */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={type.h3}>{t("spending.weeklyBudget")}</Text>
            {budget && !editing ? (
              <Pressable onPress={() => setEditing(true)} hitSlop={8} accessibilityRole="button" testID="budget-edit"><Text style={styles.link}>{t("checkout.change")}</Text></Pressable>
            ) : null}
          </View>
          {budget && !editing ? (
            <Text style={type.bodyMuted}>{t("spending.budgetSet", { amount: rm(budget) })}</Text>
          ) : (
            <>
              <Text style={type.bodyMuted}>{t("spending.pickLimit")}</Text>
              <View style={styles.quick}>
                {QUICK.map((q) => (
                  <Pressable key={q} style={[ui.chip, budget === q && ui.chipOn]} onPress={() => setTo(q)} disabled={busy} accessibilityRole="button" testID={`budget-${q}`}>
                    <Text style={[ui.chipText, budget === q && ui.chipTextOn]}>RM {q}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.customRow}>
                <Text style={type.body}>RM</Text>
                <TextInput
                  style={styles.input}
                  value={text}
                  onChangeText={(v) => setText(v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  placeholder={t("spending.otherAmount")}
                  placeholderTextColor={colors.textFaint}
                  accessibilityLabel={t("spending.budgetInput")}
                  testID="budget-input"
                />
                <PrimaryButton label={t("spending.set")} onPress={() => setTo(Number(text))} disabled={!Number(text) || busy} loading={busy} testID="budget-set" />
              </View>
              {budget ? (
                <Pressable onPress={() => setTo(null)} disabled={busy} accessibilityRole="button" testID="budget-remove">
                  <Text style={[styles.link, { color: colors.chiliText }]}>{t("spending.remove")}</Text>
                </Pressable>
              ) : null}
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {/* Last 8 weeks */}
        <View style={styles.card}>
          <Text style={type.h3}>{t("spending.last8")}</Text>
          <View style={styles.chart} accessibilityLabel={`${t("spending.weeklyChart")}: ${s.weeks.map((w, i) => `${weekLabel(w.label, i)} ${rm(w.total)}`).join(", ")}`}>
            {budget ? <View style={[styles.budgetLine, { bottom: 18 + (budget / maxWeek) * CHART_H }]} pointerEvents="none"><Text style={styles.budgetLineText}>{t("spending.budget")}</Text></View> : null}
            {s.weeks.map((w, i) => {
              const now = i === s.weeks.length - 1;
              const over = !!budget && w.total > budget;
              return (
                <View key={w.start} style={styles.barCol}>
                  {w.total > 0 ? <Text style={styles.barValue}>{Math.round(w.total)}</Text> : null}
                  <GrowBar height={(w.total / maxWeek) * CHART_H} color={over ? colors.chili : now ? colors.turmeric : colors.stoneSoft} delay={i * 50} />
                  <Text style={[styles.barLabel, now && { color: colors.ink, fontFamily: fonts.displayBold }]}>{weekLabel(w.label, i)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* This week, day by day */}
        <View style={styles.card}>
          <Text style={type.h3}>{t("spending.thisWeek")}</Text>
          <View style={styles.days}>
            {s.days.map((d, i) => (
              <View key={d.label} style={styles.dayCol}>
                <View style={styles.dayTrack}>
                  <View style={[styles.dayFill, { height: `${Math.round((d.total / maxDay) * 100)}%` as `${number}%`, backgroundColor: d.isToday ? colors.turmeric : colors.herb }]} />
                </View>
                <Text style={[styles.barLabel, d.isToday && { color: colors.ink, fontFamily: fonts.displayBold }]}>{t(DAY_KEYS[i] ?? "spending.mon")}</Text>
                <Text style={styles.dayValue}>{d.total ? Math.round(d.total) : "–"}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Where it went */}
        <View style={styles.card}>
          <Text style={type.h3}>{t("spending.whereItWent")}</Text>
          {s.topStalls.length === 0 ? (
            <Text style={type.bodyMuted}>{t("spending.noneThisMonth")}</Text>
          ) : (
            s.topStalls.map((st, i) => (
              <View key={st.name} style={styles.stallRow}>
                <View style={[styles.rank, i === 0 && { backgroundColor: colors.turmeric }]}><Text style={styles.rankText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontFamily: fonts.displayBold }]} numberOfLines={1}>{st.name}</Text>
                  <Text style={type.small}>{t("spending.orderCount", { count: st.count })}</Text>
                </View>
                <Text style={[type.body, { fontFamily: fonts.displayBold }]}>{rm(st.total)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const CHART_H = 120;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const reduced = useReducedMotion();
  const w = useRef(new Animated.Value(reduced ? Math.min(percent, 100) : 0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.min(percent, 100), duration: reduced ? 0 : 700, useNativeDriver: false }).start();
  }, [percent, reduced, w]);
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.min(percent, 100) }}>
      <Animated.View style={[styles.fill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

/** A bar that grows up from the bottom when the screen opens. */
function GrowBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const reduced = useReducedMotion();
  const h = useRef(new Animated.Value(reduced ? height : 0)).current;
  useEffect(() => {
    Animated.timing(h, { toValue: height, duration: reduced ? 0 : 500, delay: reduced ? 0 : delay, useNativeDriver: false }).start();
  }, [height, reduced, delay, h]);
  return <Animated.View style={[styles.bar, { height: h, backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  hero: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  heroLabel: { fontFamily: fonts.display, fontSize: 13, color: colors.stoneSoft },
  heroAmount: { fontFamily: fonts.displayExtraBold, fontSize: 40, color: colors.white, letterSpacing: -0.5 },
  heroSub: { fontFamily: fonts.display, fontSize: 13, color: colors.stoneSoft },
  heroStats: { flexDirection: "row", marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" },
  statValue: { fontFamily: fonts.displayExtraBold, fontSize: 16, color: colors.white },
  statLabel: { fontFamily: fonts.display, fontSize: 11, color: colors.stoneSoft },
  track: { height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  fill: { height: 10, borderRadius: 5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  link: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink, textDecorationLine: "underline" },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  customRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontFamily: fonts.display, color: colors.ink, backgroundColor: colors.paper },
  error: { fontFamily: fonts.displayBold, color: colors.chili },
  chart: { flexDirection: "row", alignItems: "flex-end", height: CHART_H + 40, gap: 6, position: "relative" },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  bar: { width: "70%", borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 2 },
  barValue: { fontFamily: fonts.displayBold, fontSize: 10, color: colors.stoneText },
  barLabel: { fontFamily: fonts.display, fontSize: 10, color: colors.stoneText },
  budgetLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.chili },
  budgetLineText: { position: "absolute", right: 0, top: -15, fontFamily: fonts.displayBold, fontSize: 10, color: colors.chiliText },
  days: { flexDirection: "row", gap: 6 },
  dayCol: { flex: 1, alignItems: "center", gap: 4 },
  dayTrack: { width: 18, height: 70, borderRadius: 9, backgroundColor: colors.paperDim, justifyContent: "flex-end", overflow: "hidden" },
  dayFill: { width: 18, borderRadius: 9 },
  dayValue: { fontFamily: fonts.displayBold, fontSize: 10.5, color: colors.ink },
  stallRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rank: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  rankText: { fontFamily: fonts.displayExtraBold, fontSize: 12, color: colors.ink },
});
