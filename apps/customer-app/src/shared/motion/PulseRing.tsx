import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

// A soft ring that keeps growing and fading behind a dot: "this step is happening now".
// Used for the current order step, live badges and the canteen map.
export default function PulseRing({ size, color, children }: { size: number; color: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1400, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, reduced]);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {!reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
              transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
            },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

/** Pops its child in with a little bounce whenever `trigger` changes (a tick appearing, a count going up). */
export function PopOnChange({ trigger, children }: { trigger: unknown; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const s = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    s.setValue(0.6);
    Animated.spring(s, { toValue: 1, speed: 20, bounciness: 14, useNativeDriver: true }).start();
  }, [trigger, reduced, s]);
  return <Animated.View style={{ transform: [{ scale: s }] }}>{children}</Animated.View>;
}
