import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, font } from "../theme/theme";

// Calm placeholder for lists with nothing in them yet.
export default function EmptyState({ icon = "file-tray-outline", title, hint }: { icon?: keyof typeof Ionicons.glyphMap; title: string; hint?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Ionicons name={icon} size={28} color={colors.ink} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing.xxl * 1.5, paddingHorizontal: spacing.xl, gap: spacing.sm },
  circle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  title: { fontSize: 18, lineHeight: 23, ...font.displayBold, color: colors.ink, textAlign: "center", letterSpacing: -0.2 },
  hint: { fontSize: 15, lineHeight: 21, ...font.serif, color: colors.stoneText, textAlign: "center", maxWidth: 320 },
});
