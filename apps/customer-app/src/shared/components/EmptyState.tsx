import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, spacing, ui } from "../theme/theme";

// Calm placeholder for lists with nothing in them yet, or a load that failed.
// Pass `action` + `onAction` to offer the next step ("Browse stalls", "Try again").
type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  action?: string;
  onAction?: () => void;
  tone?: "default" | "error";
};

export default function EmptyState({ icon = "file-tray-outline", title, hint, action, onAction, tone = "default" }: Props) {
  const error = tone === "error";
  return (
    <View style={styles.wrap}>
      <View style={[styles.circle, error && { backgroundColor: colors.chiliSoft }]}>
        <Ionicons name={icon} size={28} color={error ? colors.chiliText : colors.ink} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {action && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [ui.buttonDark, styles.action, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Text style={ui.buttonDarkText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing.xxl * 1.5, paddingHorizontal: spacing.xl, gap: spacing.sm },
  circle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  title: { fontSize: 18, lineHeight: 23, ...font.displayBold, color: colors.ink, textAlign: "center", letterSpacing: -0.2 },
  hint: { fontSize: 15, lineHeight: 21, ...font.serif, color: colors.stoneText, textAlign: "center", maxWidth: 300 },
  action: { marginTop: spacing.md, alignSelf: "center" },
});
