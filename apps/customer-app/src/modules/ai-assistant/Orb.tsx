// The voice orb button in the middle of voice mode. The drawing itself is OrbView (Skia).
// `level` (0 to 1) is how loud the customer is speaking; the orb grows with it while listening.
import React from "react";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import type { GlowMode } from "./EdgeGlow";
import OrbView from "./OrbView";

// Screen-reader label for each state (in the app's language).
const LABEL = { idle: "ai.orbIdle", listening: "ai.orbListening", thinking: "ai.orbThinking", speaking: "ai.orbSpeaking" } as const;

export default function Orb({ mode, level = 0, onPress }: { mode: GlowMode; level?: number; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t(LABEL[mode])}>
      <OrbView mode={mode} level={level} />
    </Pressable>
  );
}