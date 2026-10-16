import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, fonts } from "../theme/theme";

type Props = {
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
};

const toneMap = {
  primary: { bg: colors.primarySoft, fg: colors.turmericDeep },
  success: { bg: colors.secondarySoft, fg: colors.herb },
  warning: { bg: "#F3E4C4", fg: colors.turmericDeep },
  danger: { bg: "#F1DAD6", fg: colors.chili },
  neutral: { bg: colors.paperDim, fg: colors.stone },
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
  label: { fontSize: 11, fontFamily: fonts.displayBold },
});
