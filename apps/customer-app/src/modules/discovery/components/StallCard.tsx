import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Merchant } from "../../../shared/api/types";
import { colors, layout, spacing, ui, font } from "../../../shared/theme/theme";
import PressableScale from "../../../shared/motion/PressableScale";
import DishImage, { softTint } from "../../../shared/components/DishImage";
import ReadyChip from "./ReadyChip";
import { useTranslation } from "react-i18next";

// Stall row for the "Stalls near you" list on Home ("Browse stalls" scrolls here). Opens the stall menu.
export default function StallCard({ merchant, image, onPress }: { merchant: Merchant; image?: string; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${merchant.name}, ${merchant.stallNo}, ${t("stall.rated", { rating: merchant.rating })}, ${merchant.openNow ? t("stall.open") : t("stall.closed")}`}
      testID={`stall-${merchant.id}`}
    >
      <DishImage image={merchant.logo || image} size={68} tint={softTint(merchant.color)} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{merchant.name}</Text>
          <View style={[styles.pill, { backgroundColor: merchant.openNow ? colors.herbLight : colors.chiliSoft }]}>
            <Text style={[styles.pillText, { color: merchant.openNow ? colors.herb : colors.chiliText }]}>{merchant.openNow ? t("stall.open") : t("stall.closed")}</Text>
          </View>
        </View>
        <Text style={styles.sub} numberOfLines={1}>{merchant.stallNo}{merchant.tags.length ? ` · ${merchant.tags.join(" · ")}` : ""}</Text>
        <View style={styles.metaRow}>
          <ReadyChip merchant={merchant} variant="text" />
          <Text style={styles.meta}>·</Text>
          <Ionicons name="star" size={11} color={colors.turmericDeep} />
          <Text style={styles.meta}>{merchant.rating.toFixed(1)} · {merchant.distanceKm} km</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.stoneSoft} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginHorizontal: layout.gutter, marginBottom: spacing.md },
  info: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flexShrink: 1, ...font.displayBold, fontSize: 16, color: colors.ink, letterSpacing: -0.1 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { ...font.displayBold, fontSize: 12 },
  sub: { ...font.serif, fontSize: 14, color: colors.stoneText },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  meta: { ...font.display, fontSize: 13, color: colors.ink, fontVariant: ["tabular-nums"] },
});
