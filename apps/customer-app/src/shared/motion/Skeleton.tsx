import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme/theme";
import { useReducedMotion } from "./useReducedMotion";

// Grey placeholder shapes that gently pulse while data loads, shaped like the content that is coming,
// so the screen does not jump when it arrives. Screen readers hear "Loading" once, not every shape.
export function Skeleton({ width = "100%", height = 14, rounded = radius.sm, style }: { width?: DimensionValue; height?: number; rounded?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return <Animated.View style={[{ width, height, borderRadius: rounded, backgroundColor: colors.paperDim, opacity: reduced ? 0.8 : opacity }, style]} />;
}

/** Stall menu / saved dishes row: picture on the left, three text lines. */
export function DishRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={68} height={68} rounded={radius.md} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="95%" height={11} />
            <Skeleton width="35%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** "Popular near you" tiles: picture on top, two lines. */
export function DishTileSkeleton({ count = 3, width = 150 }: { count?: number; width?: number }) {
  return (
    <View style={styles.tiles} accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.tile, { width }]}>
          <Skeleton height={104} rounded={radius.md} />
          <Skeleton width="80%" height={13} />
          <Skeleton width="45%" height={13} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.lg, backgroundColor: colors.paper },
  tiles: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg },
  tile: { gap: 8, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.paper },
});
