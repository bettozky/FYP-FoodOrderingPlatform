// Siri-style glow around the edge of the screen, in ScootMeal's colours from theme.ts.
// Skia draws it; Reanimated animates it smoothly without re-rendering React.
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { BlurMask, Canvas, Group, RoundedRect, SweepGradient, vec } from "@shopify/react-native-skia";
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../shared/theme/theme";

export type GlowMode = "idle" | "listening" | "thinking" | "speaking";
export type GlowProps = { mode: GlowMode };

// Theme colours. The list ends with the first colour again so the loop has no visible seam.
export const GLOW_COLORS = [colors.turmericLight, colors.turmeric, colors.chili, colors.turmericDeep, colors.turmericLight];

// How long one full turn of the colours takes in each mode (milliseconds).
const SPIN_MS: Record<GlowMode, number> = { idle: 4000, listening: 3000, thinking: 1200, speaking: 2000 };

// Roughly matches the rounded corners of phone screens.
const CORNER = Platform.select({ ios: 44, android: 28, default: 16 });

export default function EdgeGlowCanvas({ mode }: GlowProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const rotation = useSharedValue(0); // angle of the colour sweep
  const opacity = useSharedValue(0); // 0 = hidden
  const thickness = useSharedValue(6); // width of the sharp line

  useEffect(() => {
    opacity.value = withTiming(mode === "idle" ? 0 : 1, { duration: 300 });

    // Spin the colours (not when idle or when the phone asks for less motion).
    cancelAnimation(rotation);
    if (mode !== "idle" && !reduceMotion) {
      const from = rotation.value % (2 * Math.PI);
      rotation.value = from;
      rotation.value = withRepeat(
        withTiming(from + 2 * Math.PI, { duration: SPIN_MS[mode], easing: Easing.linear }),
        -1, // repeat forever
        false
      );
    }

    // Speaking: the glow "breathes". Other modes: a steady width.
    cancelAnimation(thickness);
    thickness.value =
      mode === "speaking" && !reduceMotion
        ? withRepeat(withTiming(12, { duration: 450, easing: Easing.inOut(Easing.quad) }), -1, true)
        : withTiming(mode === "thinking" ? 8 : 6, { duration: 300 });
  }, [mode, reduceMotion]);

  const transform = useDerivedValue(() => [{ rotate: rotation.value }]);
  const glowWidth = useDerivedValue(() => thickness.value * 3);
  const center = vec(width / 2, height / 2);

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Group opacity={opacity}>
          {/* Soft, wide, blurred layer: the "glow" */}
          <RoundedRect x={0} y={0} width={width} height={height} r={CORNER} style="stroke" strokeWidth={glowWidth}>
            <SweepGradient c={center} colors={GLOW_COLORS} origin={center} transform={transform} />
            <BlurMask blur={18} style="normal" />
          </RoundedRect>
          {/* Thin, sharp layer on top: the bright edge line */}
          <RoundedRect x={0} y={0} width={width} height={height} r={CORNER} style="stroke" strokeWidth={thickness}>
            <SweepGradient c={center} colors={GLOW_COLORS} origin={center} transform={transform} />
          </RoundedRect>
        </Group>
      </Canvas>
    </View>
  );
}