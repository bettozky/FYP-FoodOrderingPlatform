import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../shared/theme/theme";

/** Read-only row of stars: <StarRow rating={4} />. */
export function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= Math.round(rating) ? "star" : "star-outline"} size={size} color={colors.turmeric} />
      ))}
    </View>
  );
}

/** Tap-to-choose stars (1-5) for writing a review. */
export function StarPicker({ value, onChange, size = 34 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <View style={[styles.row, { gap: 8, justifyContent: "center" }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`} testID={`star-${n}`}>
          <Ionicons name={n <= value ? "star" : "star-outline"} size={size} color={colors.turmeric} />
        </Pressable>
      ))}
    </View>
  );
}

export const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
export function RatingWord({ value }: { value: number }) {
  return <Text style={styles.word}>{RATING_WORDS[value] ?? ""}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2 },
  word: { textAlign: "center", fontSize: 13, color: colors.stoneText },
});
