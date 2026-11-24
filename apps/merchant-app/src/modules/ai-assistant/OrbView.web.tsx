// Browser: Skia's engine (public/canvaskit.wasm) loads first. Until then, or if it fails,
// a plain amber circle is shown so the orb is never missing.
import React from "react";
import { View } from "react-native";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { colors } from "../../shared/theme/theme";
import type { OrbViewProps } from "./OrbCanvas";

export const ORB_SIZE = 140; // keep the same as in OrbCanvas.tsx

function PlainOrb() {
  return (
    <View style={{ width: ORB_SIZE, height: ORB_SIZE, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.turmeric }} />
    </View>
  );
}

class PlainOnError extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[Orb] Skia orb disabled:", error);
  }
  render() {
    return this.state.failed ? <PlainOrb /> : this.props.children;
  }
}

export default function OrbView(props: OrbViewProps) {
  return (
    <PlainOnError>
      <WithSkiaWeb getComponent={() => import("./OrbCanvas")} fallback={<PlainOrb />} componentProps={props} />
    </PlainOnError>
  );
}