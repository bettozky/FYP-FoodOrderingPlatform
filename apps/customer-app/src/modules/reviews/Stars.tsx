import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../../shared/theme/theme";

/** Read-only row of stars: <StarRow rating={4} />. */
export function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} accessible accessibilityLabel={t("stars.outOf5", { rating })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= Math.round(rating) ? "star" : "star-outline"} size={size} color={colors.turmeric} />
      ))}
    </View>
  );
}

/** Tap-to-choose stars (1-5) for writing a review. */
export function StarPicker({ value, onChange, size = 34 }: { value: number; onChange: (n: number) => void; size?: number }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.row, { gap: 8, justifyContent: "center" }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("stars.count", { count: n })} testID={`star-${n}`}>
          <Ionicons name={n <= value ? "star" : "star-outline"} size={size} color={colors.turmeric} />
        </Pressable>
      ))}
    </View>
  );
}

// 1 = Poor ... 5 = Excellent, in the app's language.
export const RATING_WORDS = ["", "stars.poor", "stars.fair", "stars.good", "stars.veryGood", "stars.excellent"] as const;
export function RatingWord({ value }: { value: number }) {
  const { t } = useTranslation();
  const key = RATING_WORDS[value];
  return <Text style={styles.word}>{key ? t(key) : ""}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2 },
  word: { textAlign: "center", fontSize: 13, color: colors.stoneText },
});
