import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Merchant } from "../../../shared/api/types";
import PulseRing from "../../../shared/motion/PulseRing";
import { colors, fonts, radius, spacing } from "../../../shared/theme/theme";

// Sprint 3 busy mode, customer side. Shown on the stall menu and at checkout when the stall is over its wait limit:
//   paused -> red "Orders paused" (checkout cannot send);
//   warn   -> amber "Very busy, about 32 min" with an "I'm OK waiting" tick at checkout.
export default function BusyNotice({ merchant, accepted, onAccept }: { merchant: Merchant; accepted?: boolean; onAccept?: (v: boolean) => void }) {
  if (!merchant.openNow || (!merchant.ordersPaused && !merchant.longWaitWarning)) return null;
  const paused = !!merchant.ordersPaused;
  const tint = paused ? colors.chiliText : colors.amberText;
  return (
    <View style={[styles.box, paused ? styles.paused : styles.warn]} testID={paused ? "busy-paused" : "busy-warning"} accessibilityRole="alert">
      <View style={styles.row}>
        <PulseRing size={26} color={paused ? colors.chili : colors.turmeric}>
          <Ionicons name={paused ? "pause-circle" : "flame"} size={20} color={tint} />
        </PulseRing>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: tint }]}>
            {paused ? "Orders paused for a few minutes" : `Very busy · about ${merchant.waitMinutes ?? "?"} min wait`}
          </Text>
          <Text style={styles.text}>
            {paused
              ? `${merchant.name} is catching up on ${merchant.queue ?? "lots of"} orders. New orders open again by themselves once the wait is under ${merchant.waitLimit} min.`
              : `Usually under ${merchant.waitLimit} min. You can still order if you don't mind waiting.`}
          </Text>
        </View>
      </View>
      {!paused && onAccept ? (
        <Pressable style={styles.tick} onPress={() => onAccept(!accepted)} accessibilityRole="checkbox" accessibilityState={{ checked: !!accepted }} testID="accept-long-wait">
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>{accepted ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}</View>
          <Text style={styles.tickText}>I'm OK waiting about {merchant.waitMinutes} min</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, borderWidth: 1, marginTop: spacing.sm },
  paused: { backgroundColor: colors.chiliSoft, borderColor: colors.chiliBorder },
  warn: { backgroundColor: colors.amberTint, borderColor: colors.amberBorder },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  title: { fontFamily: fonts.displayBold, fontSize: 13.5 },
  text: { fontFamily: fonts.display, fontSize: 12, lineHeight: 16, color: colors.stoneText },
  tick: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.xs },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.amberText, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: colors.amberText },
  tickText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
});
