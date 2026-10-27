import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Merchant } from "../../../shared/api/types";
import { colors, fonts, spacing, ui } from "../../../shared/theme/theme";
import DishImage, { softTint } from "../../../shared/components/DishImage";

// Stall row for the "Stalls near you" list on Home ("Browse stalls" scrolls here). Opens the stall menu.
export default function StallCard({ merchant, image, onPress }: { merchant: Merchant; image?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={`${merchant.name}, ${merchant.stallNo}, rated ${merchant.rating}, ${merchant.openNow ? "open" : "closed"}`}
      testID={`stall-${merchant.id}`}
    >
      <DishImage image={image} size={60} tint={softTint(merchant.color)} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{merchant.name}</Text>
          <View style={[styles.pill, { backgroundColor: merchant.openNow ? colors.herbLight : colors.chiliSoft }]}>
            <Text style={[styles.pillText, { color: merchant.openNow ? colors.herb : colors.chiliText }]}>{merchant.openNow ? "Open" : "Closed"}</Text>
          </View>
        </View>
        <Text style={styles.sub} numberOfLines={1}>{merchant.stallNo}{merchant.tags.length ? ` · ${merchant.tags.join(" · ")}` : ""}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{merchant.rating.toFixed(1)}★</Text>
          <Text style={styles.meta}>· {merchant.prepMinutes} min prep · {merchant.distanceKm} km</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.stone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  info: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flexShrink: 1, fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontFamily: fonts.displayBold, fontSize: 10.5 },
  sub: { fontFamily: fonts.display, fontSize: 11.5, color: colors.stoneText },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  meta: { fontFamily: fonts.display, fontSize: 11.5, color: colors.ink },
});
