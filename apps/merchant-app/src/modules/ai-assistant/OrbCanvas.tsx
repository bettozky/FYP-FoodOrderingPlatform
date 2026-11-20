// The voice orb, drawn with Skia in a Siri-like style: three see-through soft shapes in the theme
// colours that overlap, slowly turn and change shape. Where they overlap, their colours mix.
// Gentle while listening, quick while thinking, bigger and livelier while speaking.
import React, { useEffect } from "react";
import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../shared/theme/theme";
import type { GlowMode } from "./EdgeGlowCanvas";

export const ORB_SIZE = 140; // drawing area
const R = 36; // average size of each shape
const C = ORB_SIZE / 2;
const POINTS = 5; // corners of each shape before smoothing (5 gives soft, rounded shapes with clear bends)

// The three layers, back to front: colour, turning speed (minus = the other way) and a seed that
// makes each shape's wobble different.
// Each shape also drifts a little around the middle (drift), so the layers peek out on different sides.
// Red is at the BACK, so it only shows around the edges. The front layer is cream, for a soft bright middle.
const CREAM = "#FFE7B8";
const LAYERS = [
  { color: colors.chili, turn: 0.35, seed: 0, drift: 6 },
  { color: colors.turmeric, turn: -0.3, seed: 2.3, drift: 7 },
  { color: CREAM, turn: 0.22, seed: 4.7, drift: 5 },
];
const LAYER_OPACITY = 0.85;

// Per mode: how much the shapes bend, how fast everything moves, and the overall size.
const MOTION: Record<GlowMode, { wobble: number; speed: number; size: number }> = {
  idle: { wobble: 0.5, speed: 0.3, size: 1 },
  listening: { wobble: 1, speed: 1, size: 1 },
  thinking: { wobble: 0.7, speed: 2.8, size: 0.9 },
  speaking: { wobble: 1.5, speed: 1.8, size: 1.12 },
};

export type OrbViewProps = { mode: GlowMode };

export default function OrbCanvas({ mode }: OrbViewProps) {
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(0); // moves forward every frame; drives turning and wobbling
  const wobble = useSharedValue(1);
  const speed = useSharedValue(1);
  const size = useSharedValue(1);

  // Glide smoothly to the new mode's settings instead of jumping.
  useEffect(() => {
    const m = MOTION[mode];
    const ease = { duration: 450, easing: Easing.inOut(Easing.quad) };
    wobble.value = withTiming(reduceMotion ? 0.6 : m.wobble, ease);
    speed.value = withTiming(reduceMotion ? 0 : m.speed, ease);
    size.value = withTiming(m.size, ease);
  }, [mode, reduceMotion]);

  useFrameCallback((frame) => {
    phase.value += ((frame.timeSincePreviousFrame ?? 16) / 1000) * speed.value;
  });

  const shape0 = useDerivedValue(() => blobPath(0, phase.value, wobble.value, size.value));
  const shape1 = useDerivedValue(() => blobPath(1, phase.value, wobble.value, size.value));
  const shape2 = useDerivedValue(() => blobPath(2, phase.value, wobble.value, size.value));

  return (
    <Canvas style={{ width: ORB_SIZE, height: ORB_SIZE }}>
            {/* Normal see-through layers: each one covers the one behind it, so red stays at the back */}
      <Group opacity={LAYER_OPACITY}>
        <Path path={shape0} color={LAYERS[0].color} />
      </Group>
      <Group opacity={LAYER_OPACITY}>
        <Path path={shape1} color={LAYERS[1].color} />
      </Group>
      <Group opacity={LAYER_OPACITY}>
        <Path path={shape2} color={LAYERS[2].color} />
      </Group>
    </Canvas>
  );
}

// One soft shape: points around a circle, each pushed in or out by slow waves, the whole shape
// turned by its layer's speed, then joined with smooth curves.
function blobPath(i: number, t: number, wobble: number, size: number) {
  "worklet";
  const layer = LAYERS[i];
  const turn = t * layer.turn + layer.seed;
  // Where this shape's middle is right now (drifting slowly around the real middle).
  const cx = C + Math.cos(t * 0.6 + layer.seed) * layer.drift;
  const cy = C + Math.sin(t * 0.5 + layer.seed * 1.3) * layer.drift;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let k = 0; k < POINTS; k++) {
    const angle = (k / POINTS) * Math.PI * 2 + turn;
    const wave =
      Math.sin(t * 1.1 + k * 1.9 + layer.seed) * 0.15 + Math.sin(t * 0.7 + k * 3.1 + layer.seed * 2) * 0.09;
    const r = R * size * (1 + wave * wobble);
    xs.push(cx + Math.cos(angle) * r);
    ys.push(cy + Math.sin(angle) * r);
  }
  // Skia 2: build with a PathBuilder, then detach() gives the finished path.
  const path = Skia.PathBuilder.Make();
  path.moveTo((xs[POINTS - 1] + xs[0]) / 2, (ys[POINTS - 1] + ys[0]) / 2);
  for (let k = 0; k < POINTS; k++) {
    const n = (k + 1) % POINTS;
    path.quadTo(xs[k], ys[k], (xs[k] + xs[n]) / 2, (ys[k] + ys[n]) / 2);
  }
  path.close();
  return path.detach();
}