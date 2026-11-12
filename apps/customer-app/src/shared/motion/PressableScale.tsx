import React, { useRef } from "react";
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

// A Pressable that springs down a little while pressed and bounces back, so taps feel physical.
// Use it in place of Pressable for cards and buttons: <PressableScale style={...} onPress={...}>.
// `scaleTo` is how far it shrinks (0.96 for buttons, 0.98 for big cards).
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; scaleTo?: number };

export default function PressableScale({ style, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, speed: 40, bounciness: value === 1 ? 10 : 0, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => {
        if (!reduced) to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) to(1);
        onPressOut?.(e);
      }}
    />
  );
}
