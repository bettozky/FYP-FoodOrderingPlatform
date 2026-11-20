// Sprint 3 "last-hour deals", merchant side: under each dish in Menu management.
// Start a deal (20 / 30 / 50% off, for 30 min, 1 hour or until closing) to sell leftovers before closing,
// or end one early. Customers see the deal price on Home ("Last-hour deals"), the stall menu and the dish.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../shared/api/client";
import { useCountdown } from "../../shared/util/format";
import { colors, fonts, radius, spacing } from "../../shared/theme/theme";

export type Deal = { percent: number; startedAt: number; endsAt: number };

const PERCENTS = [20, 30, 50];
const LENGTHS: { label: string; body: { minutes?: number; untilClose?: boolean } }[] = [
  { label: "30 min", body: { minutes: 30 } },
  { label: "1 hour", body: { minutes: 60 } },
  { label: "Until closing", body: { untilClose: true } },
];

/** Same rounding as the server (backend/src/modules/merchants/deals.ts). */
const dealPrice = (price: number, percent: number) => Math.max(0.5, Math.round((Math.round(price * 100) * (100 - percent)) / 1000) / 10);

function Left({ endsAt }: { endsAt: number }) {
  const s = useCountdown(endsAt);
  const m = Math.ceil(s / 60);
  return <Text style={styles.onText}>{s <= 0 ? "ended" : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min left` : `${m} min left`}</Text>;
}

export default function DealControl({ dishId, price, deal, onChanged }: { dishId: string; price: number; deal?: Deal; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState(30);
  const [length, setLength] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = deal && deal.endsAt > Date.now() ? deal : undefined;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setOpen(false);
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (active) {
    return (
      <View style={styles.on} testID={`deal-on-${dishId}`}>
        <Ionicons name="flame" size={16} color={colors.white} />
        <Text style={styles.onText}>
          {active.percent}% off · RM {dealPrice(price, active.percent).toFixed(2)} ·{" "}
        </Text>
        <Left endsAt={active.endsAt} />
        <Pressable onPress={() => run(() => api("DELETE", `/merchant/deals/${dishId}`))} disabled={busy} style={styles.endBtn} accessibilityRole="button" testID={`deal-end-${dishId}`}>
          <Text style={styles.endText}>End deal</Text>
        </Pressable>
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={styles.startLink} accessibilityRole="button" testID={`deal-open-${dishId}`}>
        <Ionicons name="flame-outline" size={15} color={colors.chiliText} />
        <Text style={styles.startLinkText}>Last-hour deal</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Discount</Text>
      <View style={styles.chips}>
        {PERCENTS.map((p) => (
          <Pressable key={p} onPress={() => setPercent(p)} style={[styles.chip, percent === p && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: percent === p }} testID={`deal-pct-${p}`}>
            <Text style={[styles.chipText, percent === p && styles.chipTextOn]}>{p}%</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>For</Text>
      <View style={styles.chips}>
        {LENGTHS.map((l, i) => (
          <Pressable key={l.label} onPress={() => setLength(i)} style={[styles.chip, length === i && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: length === i }}>
            <Text style={[styles.chipText, length === i && styles.chipTextOn]}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.preview}>
        Customers pay <Text style={{ fontFamily: fonts.displayExtraBold, color: colors.chiliText }}>RM {dealPrice(price, percent).toFixed(2)}</Text> instead of RM {price.toFixed(2)}
      </Text>
      {error ? <Text style={[styles.preview, { color: colors.chiliText }]}>{error}</Text> : null}
      <View style={styles.chips}>
        <Pressable onPress={() => run(() => api("POST", `/merchant/deals/${dishId}`, { percent, ...LENGTHS[length]!.body }))} disabled={busy} style={styles.go} accessibilityRole="button" testID={`deal-start-${dishId}`}>
          <Text style={styles.goText}>{busy ? "Starting…" : "Start deal"}</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(false)} style={styles.cancel} accessibilityRole="button">
          <Text style={styles.chipText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  on: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, backgroundColor: colors.chili, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 8, marginTop: spacing.sm },
  onText: { fontFamily: fonts.displayBold, fontSize: 12.5, color: colors.white },
  endBtn: { marginLeft: "auto", backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  endText: { fontFamily: fonts.displayBold, fontSize: 12, color: colors.chiliText },
  startLink: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: spacing.sm, paddingVertical: 4 },
  startLinkText: { fontFamily: fonts.displayBold, fontSize: 12.5, color: colors.chiliText, textDecorationLine: "underline" },
  panel: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.chiliSoft, gap: spacing.sm },
  label: { fontFamily: fonts.displayBold, fontSize: 11, color: colors.chiliText, textTransform: "uppercase", letterSpacing: 0.8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.chiliBorder },
  chipOn: { backgroundColor: colors.chili, borderColor: colors.chili },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.white, fontFamily: fonts.displayBold },
  preview: { fontFamily: fonts.display, fontSize: 12.5, color: colors.ink },
  go: { backgroundColor: colors.chili, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  goText: { fontFamily: fonts.displayExtraBold, fontSize: 13, color: colors.white },
  cancel: { paddingHorizontal: 12, paddingVertical: 8 },
});
