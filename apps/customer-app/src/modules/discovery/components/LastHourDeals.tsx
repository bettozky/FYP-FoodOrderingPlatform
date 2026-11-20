import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../shared/api/client";
import type { Dish, Merchant } from "../../../shared/api/types";
import { useCountdown } from "../../../shared/util/format";
import FadeInView from "../../../shared/motion/FadeInView";
import PulseRing from "../../../shared/motion/PulseRing";
import { colors, fonts, radius, spacing, ui } from "../../../shared/theme/theme";
import DishCard from "./DishCard";

// Sprint 3 "last-hour deals" on Home: leftover dishes stalls sell off cheaper before closing, ending soonest first,
// each with a live countdown. Hidden when no deal is on. GET /api/deals, refreshed every 30 seconds.
type DealRow = { dish: Dish; merchant: Merchant };

/** "Ends in 42 min" / "Ends in 3:05" in the last 10 minutes. */
export function endsText(s: number): string {
  if (s <= 0) return "Ended";
  if (s < 600) return `Ends in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const m = Math.ceil(s / 60);
  return m >= 60 ? `Ends in ${Math.floor(m / 60)} h ${m % 60} min` : `Ends in ${m} min`;
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
          <Text style={ui.sectionTitle}>Last-hour deals</Text>
          <Text style={styles.sub}>Leftovers before closing · cheaper, and less food wasted</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {deals.map(({ dish, merchant }, i) => (
          <FadeInView key={dish.id} index={i} from="right" style={{ gap: 6 }}>
            <EndsChip endsAt={dish.dealEndsAt} />
            <DishCard variant="grid" width={150} dish={dish} merchant={merchant} onPress={() => onOpen(dish)} onAdd={() => onAdd(dish, merchant)} />
          </FadeInView>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, gap: spacing.sm },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  sub: { fontFamily: fonts.display, fontSize: 12, color: colors.stoneText },
  row: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  ends: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: colors.chiliSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  endsUrgent: { backgroundColor: colors.chili },
  endsText: { fontFamily: fonts.displayBold, fontSize: 11, color: colors.chiliText },
});
