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
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : colors.white} />
      ) : (
        <Text
          style={[
            type.h3,
            { color: isOutline ? colors.primary : colors.white, fontSize: 15, textAlign: "center", flexShrink: 1 },
          ]}
        >
          {label}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: { opacity: 0.5 },
});
