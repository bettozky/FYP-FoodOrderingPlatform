import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

type Props = {
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
};

const toneMap = {
  primary: { bg: colors.primarySoft, fg: colors.primaryDark },
  success: { bg: colors.secondarySoft, fg: colors.secondary },
  warning: { bg: "#FBF0D9", fg: colors.warning },
  danger: { bg: "#FBE7E7", fg: colors.danger },
  neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
};

export default function Badge({ label, tone = "neutral" }: Props) {
  const t = toneMap[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  label: { fontSize: 11, fontWeight: "700" },
});
