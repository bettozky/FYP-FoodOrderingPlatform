import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

// Fades its children in while sliding them up (or in from the side) when they first appear.
// Lists pass `index` so rows arrive one after another: <FadeInView index={i}>…</FadeInView>.
type Props = {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  from?: "bottom" | "right";
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export default function FadeInView({ children, index = 0, delay = 0, from = "bottom", distance = 14, duration = 260, style }: Props) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger is capped so a long list does not keep the last rows waiting.
    const wait = delay + Math.min(index, 8) * 45;
    const anim = Animated.timing(t, { toValue: 1, duration: reduced ? 0 : duration, delay: reduced ? 0 : wait, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [t, reduced, delay, index, duration]);

  const offset = t.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : distance, 0] });
  const transform = from === "right" ? [{ translateX: offset }] : [{ translateY: offset }];
  return <Animated.View style={[style, { opacity: t, transform }]}>{children}</Animated.View>;
}
