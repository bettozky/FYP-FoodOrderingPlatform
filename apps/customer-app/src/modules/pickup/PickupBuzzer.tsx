import React, { useEffect, useRef, useState } from "react";
import i18n from "../../shared/i18n";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppNotification } from "../../shared/api/types";
import PulseRing from "../../shared/motion/PulseRing";
import { useReducedMotion } from "../../shared/motion/useReducedMotion";
import { startRing, stopRing } from "../../shared/util/ringtone";
import { colors, radius, spacing, font } from "../../shared/theme/theme";
import { counterParts } from "./counter";

// Sprint 3, "phone as a pickup buzzer".
// When the stall marks food as ready, the whole screen turns green and shows the order number, stall and counter,
// like a restaurant pager. The phone vibrates (web: a chime) until the customer taps "Collected".
// The stall can tap "Buzz again": the notice gets a new buzzedAt, so the ring starts over and the card shakes.
// "Show me where" shrinks this to a small bar and opens the Live Canteen Map with the stall picked.

type Props = {
  notice: AppNotification;
  busy: boolean;
  error: string;
  onCollected: () => void;
  onShowWhere: (merchantId?: string) => void;
};

export default function PickupBuzzer({ notice, busy, error, onCollected, onShowWhere }: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [muted, setMuted] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const d = notice.data ?? {};
  const { counter, area } = counterParts(d.stallNo);
  const buzzedAt = Number(d.buzzedAt ?? notice.createdAt);
  const buzzCount = Number(d.buzzCount ?? 1);
  const label = d.mode === "dine_in" ? i18n.t("mode.dineIn") : i18n.t("mode.takeaway");

  // Ring until collected. A new buzz from the stall un-mutes and starts the ring again.
  useEffect(() => {
    setMuted(false);
  }, [buzzedAt]);
  useEffect(() => {
    if (muted) return;
    startRing();
    return () => stopRing();
  }, [muted, buzzedAt]);

  // Shake the card on every buzz (skipped when the phone asks for less motion).
  useEffect(() => {
    if (reduced) return;
    shake.setValue(0);
    Animated.sequence(
      [1, -1, 0.8, -0.8, 0.5, -0.5, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 70, useNativeDriver: true }))
    ).start();
  }, [buzzedAt, reduced, shake]);

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]} testID="pickup-buzzer">
        <View style={styles.topRow}>
          <View style={styles.modeChip}>
            <Text style={styles.modeText}>{label}</Text>
          </View>
          <Pressable
            onPress={() => setMuted((m) => !m)}
            style={styles.muteBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={muted ? i18n.t("buzzer.soundOn") : i18n.t("buzzer.soundOff")}
            testID="buzzer-mute"
          >
            <Ionicons name={muted ? "volume-mute" : "volume-high"} size={20} color={colors.white} />
          </Pressable>
        </View>

        <Animated.View
          style={[styles.center, { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-14, 14] }) }] }]}
          accessibilityLiveRegion="assertive"
        >
          <PulseRing size={132} color={colors.white}>
            <View style={styles.bell}>
              <Ionicons name="notifications" size={58} color={colors.herb} />
            </View>
          </PulseRing>
          <Text style={styles.ready} accessibilityRole="header">{i18n.t("buzzer.ready")}</Text>
          <Text style={styles.small}>{i18n.t("buzzer.orderNumber")}</Text>
          <Text style={styles.orderNo} adjustsFontSizeToFit numberOfLines={1} testID="buzzer-order-no">#{String(d.orderId ?? "")}</Text>
          <View style={styles.where}>
            <Text style={styles.stall} numberOfLines={2}>{d.merchantName ?? i18n.t("buzzer.yourStall")}</Text>
            <View style={styles.counterRow}>
              <Ionicons name="location" size={18} color={colors.turmericLight} />
              <Text style={styles.counter}>Collect at {counter}{area ? ` · ${area}` : ""}</Text>
            </View>
          </View>
          {buzzCount > 1 ? (
            <Text style={styles.again} testID="buzzer-count">The stall buzzed you again ({buzzCount}x)</Text>
          ) : null}
        </Animated.View>

        <View style={styles.actions}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.collected, busy && { opacity: 0.6 }]}
            onPress={onCollected}
            disabled={busy}
            accessibilityRole="button"
            testID="buzzer-collected"
          >
            <Ionicons name="checkmark-circle" size={22} color={colors.herb} />
            <Text style={styles.collectedText}>{busy ? i18n.t("picker.saving") : i18n.t("buzzer.collected")}</Text>
          </Pressable>
          <Pressable style={styles.showWhere} onPress={() => onShowWhere(d.merchantId)} accessibilityRole="button" testID="buzzer-show-where">
            <Ionicons name="map-outline" size={18} color={colors.white} />
            <Text style={styles.showWhereText}>{i18n.t("buzzer.showWhere")}</Text>
          </Pressable>
          <Text style={styles.hint}>{i18n.t("buzzer.hint")}</Text>
        </View>
      </View>
    </Modal>
  );
}

/** The small bar shown while the customer looks at the map: tap it to open the buzzer again. */
export function BuzzerMiniBar({ notice, onOpen }: { notice: AppNotification; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  const d = notice.data ?? {};
  return (
    <View pointerEvents="box-none" style={[styles.miniWrap, { bottom: insets.bottom + 96 }]}>
      <Pressable style={styles.mini} onPress={onOpen} accessibilityRole="button" accessibilityLabel={i18n.t("buzzer.miniLabel")} testID="buzzer-mini">
        <PulseRing size={30} color={colors.white}>
          <Ionicons name="notifications" size={18} color={colors.white} />
        </PulseRing>
        <View style={{ flex: 1 }}>
          <Text style={styles.miniTitle} numberOfLines={1}>#{String(d.orderId ?? "")} is ready</Text>
          <Text style={styles.miniSub} numberOfLines={1}>{d.merchantName} · {counterParts(d.stallNo).counter}</Text>
        </View>
        <Text style={styles.miniOpen}>{i18n.t("buzzer.open")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.herb, paddingHorizontal: spacing.xl, justifyContent: "space-between" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modeChip: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  modeText: { ...font.displayBold, color: colors.white, fontSize: 13 },
  muteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", gap: spacing.sm },
  bell: { width: 132, height: 132, borderRadius: 66, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  ready: { ...font.displayExtraBold, fontSize: 28, color: colors.white, marginTop: spacing.lg, textAlign: "center" },
  small: { ...font.display, fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: spacing.md },
  orderNo: { ...font.displayExtraBold, fontSize: 56, color: colors.white, letterSpacing: 1 },
  where: { alignItems: "center", gap: 6, marginTop: spacing.sm },
  stall: { ...font.displayBold, fontSize: 20, color: colors.white, textAlign: "center" },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  counter: { ...font.displayBold, fontSize: 16, color: colors.turmericLight },
  again: { marginTop: spacing.md, ...font.displayBold, color: colors.ink, backgroundColor: colors.turmericLight, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, overflow: "hidden" },
  actions: { gap: spacing.md, alignItems: "stretch" },
  collected: { flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 18 },
  collectedText: { ...font.displayExtraBold, fontSize: 18, color: colors.herb },
  showWhere: { flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, paddingVertical: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)" },
  showWhereText: { ...font.displayBold, fontSize: 16, color: colors.white },
  hint: { ...font.display, fontSize: 12, color: "rgba(255,255,255,0.75)", textAlign: "center" },
  error: { ...font.displayBold, color: colors.white, backgroundColor: colors.chili, padding: spacing.sm, borderRadius: radius.sm, textAlign: "center", overflow: "hidden" },
  miniWrap: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
  mini: { width: "100%", maxWidth: 480, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.herb, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, shadowColor: "#15130F", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 8 },
  miniTitle: { ...font.displayExtraBold, color: colors.white, fontSize: 15 },
  miniSub: { ...font.display, color: "rgba(255,255,255,0.85)", fontSize: 12 },
  miniOpen: { ...font.displayExtraBold, color: colors.turmericLight, fontSize: 14 },
});
