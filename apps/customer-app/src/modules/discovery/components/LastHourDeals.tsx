import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../shared/api/client";
import type { Dish, Merchant } from "../../../shared/api/types";
import { useCountdown } from "../../../shared/util/format";
import FadeInView from "../../../shared/motion/FadeInView";
import PulseRing from "../../../shared/motion/PulseRing";
import { colors, layout, radius, spacing, ui, font } from "../../../shared/theme/theme";
import DishCard from "./DishCard";
import i18n from "../../../shared/i18n";
import { useTranslation } from "react-i18next";

// Sprint 3 "last-hour deals" on Home: leftover dishes stalls sell off cheaper before closing, ending soonest first,
// each with a live countdown. Hidden when no deal is on. GET /api/deals, refreshed every 30 seconds.
type DealRow = { dish: Dish; merchant: Merchant };

/** "Ends in 42 min" / "Ends in 3:05" in the last 10 minutes. */
export function endsText(s: number): string {
  if (s <= 0) return i18n.t("deals.ended");
  if (s < 600) return i18n.t("deals.endsIn", { time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` });
  const m = Math.ceil(s / 60);
  return i18n.t("deals.endsIn", { time: m >= 60 ? i18n.t("deals.hMin", { h: Math.floor(m / 60), m: m % 60 }) : i18n.t("deals.min", { m }) });
}

export function EndsChip({ endsAt }: { endsAt?: number }) {
  const s = useCountdown(endsAt);
  const urgent = s > 0 && s < 600;
  return (
    <View style={[styles.ends, urgent && styles.endsUrgent]}>
      <Ionicons name="time-outline" size={12} color={urgent ? colors.white : colors.chiliText} />
      <Text style={[styles.endsText, urgent && { color: colors.white }]}>{endsText(s)}</Text>
    </View>
  );
}

export default function LastHourDeals({ onOpen, onAdd }: { onOpen: (d: Dish) => void; onAdd: (d: Dish, m: Merchant) => unknown }) {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<DealRow[]>([]);

  useEffect(() => {
    const load = () => api<{ deals: DealRow[] }>("GET", "/deals").then((r) => setDeals(r.deals)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (!deals.length) return null;
  return (
    <View style={styles.wrap} testID="last-hour-deals">
      <View style={styles.head}>
        <PulseRing size={26} color={colors.chili}>
          <Ionicons name="flame" size={18} color={colors.chili} />
        </PulseRing>
        <View style={{ flex: 1 }}>
          <Text style={ui.sectionTitle}>{t("deals.title")}</Text>
          <Text style={styles.sub}>{t("deals.sub")}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {deals.map(({ dish, merchant }, i) => (
          <FadeInView key={dish.id} index={i} from="right" style={{ gap: 6 }}>
            <EndsChip endsAt={dish.dealEndsAt} />
            <DishCard variant="grid" width={164} dish={dish} merchant={merchant} onPress={() => onOpen(dish)} onAdd={() => onAdd(dish, merchant)} />
          </FadeInView>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: layout.section, gap: spacing.md },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: layout.gutter },
  sub: { ...font.serif, fontSize: 14, color: colors.stoneText, marginTop: 2 },
  row: { paddingHorizontal: layout.gutter, gap: spacing.md, paddingBottom: spacing.sm },
  ends: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: colors.chiliSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  endsUrgent: { backgroundColor: colors.chili },
  endsText: { ...font.displayBold, fontSize: 12, color: colors.chiliText, fontVariant: ["tabular-nums"] },
});
