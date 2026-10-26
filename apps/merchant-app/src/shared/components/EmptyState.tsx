import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing } from "../theme/theme";

// Friendly placeholder for lists with nothing in them yet.
export default function EmptyState({ icon = "file-tray-outline", title, hint }: { icon?: keyof typeof Ionicons.glyphMap; title: string; hint?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Ionicons name={icon} size={30} color={colors.turmericDeep} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing.xxl * 1.5, paddingHorizontal: spacing.xl, gap: spacing.sm },
  circle: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.amberTint, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  title: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.ink, textAlign: "center" },
  hint: { fontSize: 13, fontFamily: fonts.serif, color: colors.stone, textAlign: "center", lineHeight: 19 },
});
