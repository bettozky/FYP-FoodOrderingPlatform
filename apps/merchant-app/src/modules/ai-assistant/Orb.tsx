// The voice orb button in the middle of voice mode. The drawing itself is OrbView (Skia).
// `level` (0 to 1) is how loud the merchant is speaking; the orb grows with it while listening.
import React from "react";
import { Pressable } from "react-native";
import type { GlowMode } from "./EdgeGlow";
import OrbView from "./OrbView";

const LABEL: Record<GlowMode, string> = {
  idle: "tap to talk",
  listening: "listening, tap when done",
  thinking: "thinking",
  speaking: "speaking",
};

export default function Orb({ mode, level = 0, onPress }: { mode: GlowMode; level?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Assistant, ${LABEL[mode]}`}>
      <OrbView mode={mode} level={level} />
    </Pressable>
  );
}