import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { colors, radius, spacing, font } from "../theme/theme";

// primary = ink (the merchant app's identity colour); accent = turmeric for the one most important action;
// danger = deep chili (white text passes contrast); success = herb; outline / ghostLight = bordered pills.
type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "accent" | "danger" | "outline" | "success" | "ghostLight";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
};

const BG: Record<NonNullable<Props["variant"]>, string> = {
  primary: colors.ink,
  accent: colors.turmeric,
  danger: colors.chiliText,
  success: colors.herb,
  outline: colors.paper,
  ghostLight: "transparent",
};

export default function PrimaryButton({ label, onPress, variant = "primary", disabled, loading, style, testID }: Props) {
  const fg = variant === "outline" || variant === "accent" ? colors.ink : colors.white;
  const off = disabled && !loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BG[variant] },
        variant === "outline" && styles.outline,
        variant === "ghostLight" && styles.ghostLight,
        // Disabled: a flat grey pill with grey text, so it never looks tappable.
        off && styles.disabled,
        loading && { opacity: 0.7 },
        pressed && !off && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: off ? colors.stoneText : fg }]} numberOfLines={2}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 50, paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  label: { ...font.displayBold, fontSize: 16, textAlign: "center" },
  ghostLight: { borderWidth: 1, borderColor: colors.stoneText },
  outline: { borderWidth: 1, borderColor: colors.stoneSoft },
  disabled: { backgroundColor: colors.paperDim, borderColor: colors.paperDim },
});
