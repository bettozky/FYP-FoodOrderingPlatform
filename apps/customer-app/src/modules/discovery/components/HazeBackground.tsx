import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { colors } from "../../../shared/theme/theme";
import { useReducedMotion } from "../../../shared/motion/useReducedMotion";

// A soft yellow haze behind the top of Home, fading into the page colour. Two blurry blobs drift slowly.
// It sits behind the content (absolute, ignores touches) and scrolls away with the header.
const HEIGHT = 430;
const BLEED = 60; // the blobs are drawn this much wider than the screen, so drifting never shows the edge of the drawing

function Drift({ children, dx, dy, ms, reduced }: { children: React.ReactNode; dx: number; dy: number; ms: number; reduced: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, ms, v]);
  const tx = v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  return <Animated.View style={[styles.drift, { transform: [{ translateX: tx }, { translateY: ty }] }]}>{children}</Animated.View>;
}

export default function HazeBackground() {
  const reduced = useReducedMotion();
  return (
    <View pointerEvents="none" style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={HEIGHT}>
        <Defs>
          <LinearGradient id="hzBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE08A" />
            <Stop offset="0.48" stopColor="#FFEFB8" />
            <Stop offset="1" stopColor={colors.bg} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={HEIGHT} fill="url(#hzBase)" />
      </Svg>
      <Drift dx={40} dy={18} ms={9000} reduced={reduced}>
        <Svg width="100%" height={HEIGHT}>
          <Defs>
            <RadialGradient id="hzA" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFC430" stopOpacity="0.85" />
              <Stop offset="1" stopColor="#FFC430" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="120" cy="80" r="150" fill="url(#hzA)" />
        </Svg>
      </Drift>
      <Drift dx={-36} dy={24} ms={11000} reduced={reduced}>
        <Svg width="100%" height={HEIGHT}>
          <Defs>
            <RadialGradient id="hzB" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFAA40" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#FFAA40" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="390" cy="150" r="160" fill="url(#hzB)" />
        </Svg>
      </Drift>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, height: HEIGHT, overflow: "hidden" },
  drift: { position: "absolute", top: 0, bottom: 0, left: -BLEED, right: -BLEED },
});
