import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, font, layout, spacing, ui } from "../theme/theme";

// Section title with an optional action on the right ("See all") or a quiet note ("3 open now").
type Props = {
  title: string;
  action?: string;
  onAction?: () => void;
  note?: string;
  actionTestID?: string;
  /** Side padding; defaults to the screen gutter. Pass 0 inside a padded container. */
  inset?: number;
  style?: ViewStyle;
};

export default function SectionHeader({ title, action, onAction, note, actionTestID, inset = layout.gutter, style }: Props) {
  return (
    <View style={[styles.row, { paddingHorizontal: inset }, style]}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button" testID={actionTestID}>
          <Text style={ui.link}>{action}</Text>
        </Pressable>
      ) : note ? (
        <Text style={styles.note}>{note}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.md, marginTop: layout.section, marginBottom: spacing.md },
  title: { ...ui.sectionTitle, flexShrink: 1 },
  note: { ...font.display, fontSize: 13, color: colors.stoneText },
});
