import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, font, ui } from "../theme/theme";

// One row of the dashboard's grouped list: an ink icon on a grey tile, title, one-line hint, and either a
// count (e.g. 3 new orders) or a chevron. Wrap several in <NavGroup> to get a single card with hairlines.
type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  /** Kept for old call sites; icons are ink now so the list reads as one calm block. */
  tint?: string;
  title: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
  testID?: string;
};

export default function NavRow({ icon, title, subtitle, badge, onPress, testID }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: any) => [styles.row, (pressed || hovered) && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${title}, ${badge} waiting` : title}
      testID={testID}
    >
      <View style={styles.tile}>
        <Ionicons name={icon} size={20} color={colors.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text></View>
      ) : null}
      <Ionicons name="chevron-forward" size={17} color={colors.stoneSoft} />
    </Pressable>
  );
}

/** A white rounded group of NavRows split by hairlines (iOS inset grouped list). */
export function NavGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? <Text style={styles.groupTitle} accessibilityRole="header">{title}</Text> : null}
      <View style={ui.group}>
        {rows.map((r, i) => (
          <View key={i}>
            {r}
            {i < rows.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const TILE = 34;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.paper },
  pressed: { backgroundColor: colors.paperDim },
  tile: { width: TILE, height: TILE, borderRadius: 9, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, ...font.displayBold, color: colors.ink },
  sub: { fontSize: 14, ...font.serif, color: colors.stoneText, marginTop: 1 },
  badge: { minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 13, ...font.displayExtraBold, color: colors.ink, fontVariant: ["tabular-nums"] },
  groupTitle: { ...font.displayBold, fontSize: 13, color: colors.stoneText, marginLeft: spacing.lg },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.stoneSoft, marginLeft: spacing.lg + TILE + spacing.md },
});
