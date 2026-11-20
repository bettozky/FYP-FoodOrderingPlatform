import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useReducedMotion } from "../../../shared/motion/useReducedMotion";

// The flickering flame (three layers, each flickering at its own speed) with sparks that float up from it.
// Sits on top of the "Trending" icon, centred on the icon, and ignores touches.
const W = 34;
const H = 46;

function Layer({ d, fill, ms, squash, reduced }: { d: string; fill: string; ms: number; squash: number; reduced: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, ms, v]);
  const scaleY = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + squash] });
  const scaleX = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 - squash * 0.6] });
  const rotate = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["2deg", "-3deg", "3deg"] });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: "50% 100%", transform: [{ scaleX }, { scaleY }, { rotate }] }]}>
      <Svg width={W} height={H} viewBox="0 0 32 44">
        <Path d={d} fill={fill} />
      </Svg>
    </Animated.View>
  );
}

function Spark({ dx, delay, reduced }: { dx: number; delay: number; reduced: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, delay, v]);
  if (reduced) return null;
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, -34] });
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const opacity = v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] });
  return <Animated.View style={[styles.spark, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]} />;
}

export default function Flame() {
  const reduced = useReducedMotion();
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Layer reduced={reduced} ms={450} squash={0.1} fill="#FF4D1A" d="M16 2c1 7 9 11 9 22a9 9 0 0 1-18 0c0-5 3-8 4-11 2 2 3 4 3 6 2-4 2-10 2-17z" />
      <Layer reduced={reduced} ms={350} squash={0.14} fill="#FF9A1F" d="M16 14c1 5 6 7 6 13a6 6 0 0 1-12 0c0-3 2-5 3-7 1 1 2 2 2 3 1-3 1-6 1-9z" />
      <Layer reduced={reduced} ms={275} squash={0.2} fill="#FFE27A" d="M16 26c.5 3 3 4 3 7a3 3 0 0 1-6 0c0-2 1-3 2-4 .5.7 1 1 1 1z" />
      <Spark reduced={reduced} dx={-12} delay={0} />
      <Spark reduced={reduced} dx={10} delay={600} />
      <Spark reduced={reduced} dx={2} delay={1100} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: -30, left: "50%", marginLeft: -W / 2, width: W, height: H, zIndex: 3 },
  spark: { position: "absolute", left: W / 2 - 2, top: 6, width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFC93C" },
});
