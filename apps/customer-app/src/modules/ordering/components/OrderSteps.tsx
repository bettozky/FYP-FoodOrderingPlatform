import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, font } from "../../../shared/theme/theme";
import PulseRing, { PopOnChange } from "../../../shared/motion/PulseRing";
import { useTranslation } from "react-i18next";

// The three-step journey every order follows: send the request, the stall confirms, then the customer pays.
// current = the step in progress (0, 1 or 2). Steps before it show a tick; 3 means all done.
const STEP_KEYS = ["steps.request", "steps.confirms", "steps.pay"] as const;

export function OrderSteps({ current }: { current: 0 | 1 | 2 | 3 }) {
  const compact = useWindowDimensions().width < 360;
  const { t } = useTranslation();
  const STEPS = STEP_KEYS.map((k) => t(k));
  return (
    <View style={styles.row} accessible accessibilityLabel={t("steps.label", { n: Math.min(current + 1, 3), step: STEPS[Math.min(current, 2)] })}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <View style={styles.step}>
              {/* Animated (Nathan, task 1): the active step pulses and a step pops when it is done. */}
              <PopOnChange trigger={done ? "done" : active ? "active" : "todo"}>
                {active ? (
                  <PulseRing size={24} color={colors.turmeric}>
                    <View style={[styles.dot, styles.dotActive]}>
                      <Text style={[styles.dotText, { color: colors.ink }]}>{i + 1}</Text>
                    </View>
                  </PulseRing>
                ) : (
                  <View style={[styles.dot, done && styles.dotDone]}>
                    {done ? <Ionicons name="checkmark" size={13} color={colors.white} /> : <Text style={styles.dotText}>{i + 1}</Text>}
                  </View>
                )}
              </PopOnChange>
              {/* Narrow phones (under 360pt) only have room for the current step's name; the others show their number. */}
              {active || current >= 3 || !compact ? (
                <Text style={[styles.label, (active || done) && styles.labelOn]} numberOfLines={1}>{label}</Text>
              ) : null}
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
  const { t } = useTranslation();
  return (
    <View style={styles.note}>
      <Ionicons name="checkmark-circle" size={20} color={colors.herb} style={{ marginTop: 1 }} />
      <Text style={styles.noteText}>
        {children ?? (
          <>
            <Text style={styles.noteBold}>{t("steps.notCharged")}</Text> {t("steps.notChargedText")}
          </>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  step: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, minWidth: 0 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  dotActive: { backgroundColor: colors.turmeric },
  dotDone: { backgroundColor: colors.herb },
  dotText: { ...font.displayBold, fontSize: 12, color: colors.stoneText },
  label: { ...font.display, fontSize: 13, color: colors.stoneText, flexShrink: 1 },
  labelOn: { ...font.displayBold, color: colors.ink },
  bar: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.stoneLine, minWidth: 8 },
  barDone: { backgroundColor: colors.herb },
  note: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: colors.herbLight, borderRadius: radius.md, borderWidth: 1, borderColor: colors.herbBorder, padding: spacing.lg },
  noteText: { flex: 1, ...font.serif, fontSize: 14, lineHeight: 20, color: colors.herb },
  noteBold: { ...font.displayBold },
});
