import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, layout, spacing, ui } from "../theme/theme";

// iOS-style inset grouped list: a white rounded group of rows split by hairlines, with an optional small
// heading above and a footnote below. Used for Account, settings and any other menu-shaped list.

export function ListGroup({ title, footer, children, style }: { title?: string; footer?: string; children: React.ReactNode; style?: ViewStyle }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.wrap, style]}>
      {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
      <View style={ui.group}>
        {rows.map((row, i) => (
          <View key={i}>
            {row}
            {i < rows.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

type RowProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon colour; defaults to ink. Use chili for destructive rows. */
  tone?: "default" | "danger";
  value?: string;
  /** Small count bubble on the right (e.g. unread). */
  badge?: number;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  /** Hide the chevron (e.g. for a Sign out row). */
  chevron?: boolean;
};

export function ListRow({ label, icon, tone = "default", value, badge, onPress, testID, accessibilityLabel, chevron = true }: RowProps) {
  const danger = tone === "danger";
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? (badge ? `${label}, ${badge} new` : label)}
      testID={testID}
    >
      {icon ? (
        <View style={[styles.iconBox, danger && { backgroundColor: colors.chiliSoft }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.chiliText : colors.ink} />
        </View>
      ) : null}
      <Text style={[styles.label, danger && { color: colors.chiliText }]} numberOfLines={1}>{label}</Text>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
      {onPress && chevron ? <Ionicons name="chevron-forward" size={17} color={colors.stoneSoft} /> : null}
    </Pressable>
  );
}

const ICON = 30;

const styles = StyleSheet.create({
  wrap: { marginHorizontal: layout.gutter, marginTop: spacing.xl },
  title: { ...font.displayBold, fontSize: 13, color: colors.stoneText, marginLeft: spacing.lg, marginBottom: spacing.sm },
  footer: { ...font.serif, fontSize: 13, lineHeight: 18, color: colors.stoneText, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.paper },
  rowPressed: { backgroundColor: colors.paperDim },
  iconBox: { width: ICON, height: ICON, borderRadius: 8, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, minWidth: 0, ...font.serif, fontSize: 16, color: colors.ink },
  value: { flexShrink: 1, maxWidth: "45%", ...font.serif, fontSize: 15, color: colors.stoneText, textAlign: "right" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.chili, alignItems: "center", justifyContent: "center" },
  badgeText: { ...font.displayBold, fontSize: 12, color: colors.white },
  // Hairline starts after the icon, like iOS.
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.stoneLine, marginLeft: spacing.lg + ICON + spacing.md },
});
