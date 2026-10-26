import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, fonts } from "../theme/theme";

type Props = {
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
};

const toneMap = {
  primary: { bg: colors.primarySoft, fg: colors.amberText },
  success: { bg: colors.secondarySoft, fg: colors.herb },
  warning: { bg: colors.amberSoft, fg: colors.amberText },
  danger: { bg: colors.chiliSoft, fg: colors.chiliText },
  neutral: { bg: colors.paperDim, fg: colors.stoneText },
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
    maxWidth: "100%",
  },
  label: { fontSize: 12, fontFamily: fonts.displayBold, flexShrink: 1 },
});
