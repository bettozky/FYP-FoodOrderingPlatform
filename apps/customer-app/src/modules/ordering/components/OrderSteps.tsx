import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../../../shared/theme/theme";

// The three-step journey every order follows: send the request, the stall confirms, then the customer pays.
// current = the step in progress (0, 1 or 2). Steps before it show a tick; 3 means all done.
const STEPS = ["Request", "Stall confirms", "Pay"];

export function OrderSteps({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Step ${Math.min(current + 1, 3)} of 3: ${STEPS[Math.min(current, 2)]}`}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <View style={styles.step}>
              <View style={[styles.dot, active && styles.dotActive, done && styles.dotDone]}>
                {done ? <Ionicons name="checkmark" size={13} color={colors.white} /> : <Text style={[styles.dotText, active && { color: colors.ink }]}>{i + 1}</Text>}
              </View>
              <Text style={[styles.label, (active || done) && styles.labelOn]} numberOfLines={1}>{label}</Text>
            </View>
            {i < STEPS.length - 1 && <View style={[styles.bar, done && styles.barDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// Green reassurance box: the customer is not charged until the stall confirms.
export function NotChargedNote({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.note}>
      <Ionicons name="checkmark-circle" size={20} color={colors.herb} style={{ marginTop: 1 }} />
      <Text style={styles.noteText}>
        {children ?? (
          <>
            <Text style={styles.noteBold}>You are not charged yet.</Text> The stall has 10 minutes to confirm. You pay after it says yes.
          </>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  step: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  dotActive: { backgroundColor: colors.turmeric },
  dotDone: { backgroundColor: colors.herb },
  dotText: { fontFamily: fonts.displayExtraBold, fontSize: 12, color: colors.stoneText },
  label: { fontFamily: fonts.display, fontSize: 12, color: colors.stoneText },
  labelOn: { fontFamily: fonts.displayExtraBold, color: colors.ink },
  bar: { flex: 1, height: 2, backgroundColor: colors.border, minWidth: 8 },
  barDone: { backgroundColor: colors.herb },
  note: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: colors.herbLight, borderRadius: radius.md, borderWidth: 1, borderColor: colors.herbBorder, padding: spacing.md },
  noteText: { flex: 1, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, color: colors.herb },
  noteBold: { fontFamily: fonts.displayBold },
});
