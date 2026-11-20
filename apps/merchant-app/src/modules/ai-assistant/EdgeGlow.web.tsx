// Browser: Skia needs its engine (public/canvaskit.wasm) loaded first. WithSkiaWeb loads it,
// then shows the glow. If loading fails, the glow is skipped instead of crashing the app.
import React from "react";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import type { GlowProps } from "./EdgeGlowCanvas";
export type { GlowMode, GlowProps } from "./EdgeGlowCanvas";

class SkipOnError extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[EdgeGlow] glow disabled:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function EdgeGlow(props: GlowProps) {
  return (
    <SkipOnError>
      <WithSkiaWeb getComponent={() => import("./EdgeGlowCanvas")} fallback={null} componentProps={props} />
    </SkipOnError>
  );
}