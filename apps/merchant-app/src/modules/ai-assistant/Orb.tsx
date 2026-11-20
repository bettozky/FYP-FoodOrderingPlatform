// The voice orb button in the middle of voice mode. The drawing itself is OrbView (Skia).
import React from "react";
import { Pressable } from "react-native";
import type { GlowMode } from "./EdgeGlow";
import OrbView from "./OrbView";

const LABEL: Record<GlowMode, string> = { idle: "ready", listening: "listening", thinking: "thinking", speaking: "speaking" };

export default function Orb({ mode, onPress }: { mode: GlowMode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Assistant, ${LABEL[mode]}`}>
      <OrbView mode={mode} />
    </Pressable>
  );
}