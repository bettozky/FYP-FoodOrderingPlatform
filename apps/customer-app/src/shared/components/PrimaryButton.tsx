import React from "react";
import { Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import PressableScale from "../motion/PressableScale";
import { colors, radius, spacing, type } from "../theme/theme";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export default function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  testID,
}: Props) {
  const isOutline = variant === "outline";
  const isSecondary = variant === "secondary";
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      style={[
        styles.base,
        isOutline && styles.outline,
        isSecondary && styles.secondary,
        !isOutline && !isSecondary && styles.primary,
        // Disabled (not loading): a flat grey pill with grey text, so it never looks tappable.
        disabled && !loading && (isOutline ? styles.disabledOutline : styles.disabled),
        loading && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.white : colors.ink} />
      ) : (
        <Text style={[type.h3, { color: disabled ? colors.stoneText : isSecondary ? colors.white : colors.ink, textAlign: "center", flexShrink: 1 }]}>
          {label}
        </Text>
      )}
    </PressableScale>
  );
}

// primary = the screen's main action (turmeric, ink label); secondary = ink; outline = quiet bordered pill.
const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.turmeric },
  secondary: { backgroundColor: colors.ink },
  outline: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.stoneSoft,
  },
  disabled: { backgroundColor: colors.paperDim, borderColor: colors.paperDim },
  disabledOutline: { borderColor: colors.stoneLine },
});
