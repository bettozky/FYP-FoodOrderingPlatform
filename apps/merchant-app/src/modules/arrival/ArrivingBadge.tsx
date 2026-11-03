import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../../shared/theme/theme";

// Feature 2 "Ready when you arrive" (merchant side): shows when the customer tapped "I'm 5 min away",
// so the stall can time dine-in / takeaway food to be fresh when they walk up.
export default function ArrivingBadge({ arrivingAt, active }: { arrivingAt?: number; active: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!arrivingAt || !active) return;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [arrivingAt, active]);

  if (!arrivingAt || !active) return null;
  const mins = Math.ceil((arrivingAt - now) / 60000);
  const at = new Date(arrivingAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const here = mins <= 0;
  return (
    <View style={[styles.badge, here && styles.here]} accessibilityLiveRegion="polite" testID="arriving-badge">
      <Ionicons name="walk" size={15} color={here ? colors.white : colors.ink} />
      <Text style={[styles.text, here && { color: colors.white }]}>
        {here ? `Customer should be here now (${at})` : `Customer arrives in ${mins} min (${at})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "flex-start", backgroundColor: colors.turmeric, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  here: { backgroundColor: colors.herb },
  text: { fontFamily: fonts.displayBold, fontSize: 12.5, color: colors.ink },
});
