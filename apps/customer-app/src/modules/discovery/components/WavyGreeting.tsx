import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../../../shared/theme/theme";
import { useReducedMotion } from "../../../shared/motion/useReducedMotion";

// "Hi Demo," with every letter rippling up and down in turn, then "what are you craving?" underneath.
// The name is in extra-bold type with a different colour per letter. Reduced-motion users get it standing still.
const NAME_COLOURS = ["#E11D48", "#EA580C", "#15803D", "#7C3AED"];
const CYCLE_MS = 2400;
const STEP_MS = 80;

function Letter({ ch, index, color, bold, reduced }: { ch: string; index: number; color: string; bold: boolean; reduced: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const lead = Math.min(index, 14) * STEP_MS;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(lead),
        Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(CYCLE_MS - lead - 800),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, index, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-5deg"] });
  return (
    <Animated.Text style={[styles.big, { color, fontFamily: bold ? fonts.displayExtraBold : fonts.displayBold, transform: [{ translateY }, { rotate }] }]}>
      {ch === " " ? " " : ch}
    </Animated.Text>
  );
}

export default function WavyGreeting({ name }: { name: string }) {
  const reduced = useReducedMotion();
  const letters = useMemo(() => {
    const first = [..."Hi "].map((ch) => ({ ch, bold: false, color: colors.ink }));
    const who = [...name].map((ch, i) => ({ ch, bold: true, color: NAME_COLOURS[i % NAME_COLOURS.length] }));
    return [...first, ...who, { ch: ",", bold: false, color: colors.ink }];
  }, [name]);
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel={`Hi ${name}, what are you craving?`}>
      <View style={styles.line} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {letters.map((l, i) => (
          <Letter key={`${i}-${l.ch}`} ch={l.ch} index={i} color={l.color} bold={l.bold} reduced={reduced} />
        ))}
      </View>
      <Text style={styles.second} importantForAccessibility="no-hide-descendants">what are you craving?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  big: { fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  second: { fontSize: 29, lineHeight: 36, fontFamily: fonts.displayBold, color: colors.ink, letterSpacing: -0.5 },
});
