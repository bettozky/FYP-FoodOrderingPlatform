import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { colors, radius, fonts } from "../theme/theme";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "danger" | "outline" | "success" | "ghostLight";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export default function PrimaryButton({ label, onPress, variant = "primary", disabled, loading, style, testID }: Props) {
  const bg = variant === "danger" ? colors.chili : variant === "success" ? colors.herb : variant === "outline" || variant === "ghostLight" ? "transparent" : colors.primary;
  const fg = variant === "outline" ? colors.primary : colors.white;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.base, { backgroundColor: bg }, variant === "outline" && styles.outline, variant === "ghostLight" && styles.ghostLight, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontFamily: fonts.displayBold, fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  ghostLight: { borderWidth: 1.5, borderColor: colors.stoneText },
  outline: { borderWidth: 1.5, borderColor: colors.primary },
});
