import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { activeOrder } from "../../data/mockData";
import {
  assignOrder,
  fetchTracking,
  DELIVERY_DESTINATION,
  Tracking,
  DeliveryStatus,
} from "../../data/deliveryApi";
import { colors, radius, spacing, type, fonts, shadow } from "../../theme/theme";

// react-native-maps has no web renderer, so the browser build of this screen
// shows the same live status feed (real backend or local simulator, same as
// the native screen) over a lightweight route illustration instead of a real
// map. On a phone build (LiveTrackingScreen.tsx) this becomes an actual
// OpenStreetMap view with an animated rider marker.

const STAGES: { key: DeliveryStatus; label: string }[] = [
  { key: "assigned", label: "Confirmed" },
  { key: "picked_up", label: "Picked up" },
  { key: "en_route", label: "On the way" },
  { key: "delivered", label: "Delivered" },
];

function stageIndex(status: DeliveryStatus) {
  const i = STAGES.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

const POLL_MS = 1000;
const PATH = "M28 200 L28 150 L110 150 L110 95 L200 95 L200 40 L256 40";

function pointAt(t: number) {
  // walk the angular polyline above at fraction t (0..1)
  const segs = [
    [28, 200, 28, 150],
    [28, 150, 110, 150],
    [110, 150, 110, 95],
    [110, 95, 200, 95],
    [200, 95, 200, 40],
    [200, 40, 256, 40],
  ];
  const lengths = segs.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1));
  const total = lengths.reduce((a, b) => a + b, 0);
  let dist = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= lengths[i] || i === segs.length - 1) {
      const [x1, y1, x2, y2] = segs[i];
      const f = lengths[i] === 0 ? 0 : dist / lengths[i];
      return { x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f };
    }
    dist -= lengths[i];
  }
  return { x: 256, y: 40 };
}

function RouteMap({ progress }: { progress: number }) {
  const p = pointAt(Math.max(0, Math.min(1, progress)));
  return (
    <View style={styles.mapBox}>
      <Svg width="100%" height="100%" viewBox="0 0 284 230">
        <Rect width="284" height="230" fill="#EDEEEA" />
        <Path d={PATH} stroke="#D8D6CC" strokeWidth={16} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Path
          d={PATH}
          stroke={colors.ink}
          strokeWidth={3}
          fill="none"
          strokeDasharray="1 10"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={28} cy={200} r={9} fill={colors.turmeric} stroke="#fff" strokeWidth={3} />
        <Circle cx={256} cy={40} r={9} fill={colors.ink} stroke="#fff" strokeWidth={3} />
        <Circle cx={p.x} cy={p.y} r={12} fill={colors.white} stroke={colors.ink} strokeWidth={2} />
      </Svg>
    </View>
  );
}

export default function LiveTrackingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    start();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function start() {
    const t = await assignOrder(activeOrder.id, {
      lat: DELIVERY_DESTINATION.lat,
      lng: DELIVERY_DESTINATION.lng,
    });
    setTracking(t);
    pollRef.current = setInterval(poll, POLL_MS);
  }

  async function poll() {
    const t = await fetchTracking(activeOrder.id);
    if (t) setTracking(t);
    if (t?.status === "delivered" && pollRef.current) {
      clearInterval(pollRef.current);
    }
  }

  const currentStage = tracking ? stageIndex(tracking.status) : -1;
  const progress = tracking ? Math.max(currentStage, 0) / (STAGES.length - 1) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.mapWrap}>
        <RouteMap progress={progress} />
        <View style={[styles.topRow, { top: insets.top + spacing.sm }]}>
          {navigation.canGoBack() && (
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
          )}
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>Live</Text>
          </View>
        </View>
      </View>

      <View style={styles.wrap}>
        <View style={[styles.sheet, shadow.card]}>
          <View style={styles.riderRow}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderAvatarText}>{tracking?.rider ? tracking.rider.name.charAt(0) : "?"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{tracking?.rider ? tracking.rider.name : "Finding a rider…"}</Text>
              <Text style={type.bodyMuted}>Your delivery partner</Text>
            </View>
          </View>

          <View style={styles.stepper}>
            {STAGES.map((s, i) => {
              const done = i <= currentStage;
              const isLast = i === STAGES.length - 1;
              return (
                <React.Fragment key={s.key}>
                  <View style={styles.step}>
                    <View style={[styles.stepDot, done && styles.stepDotDone]} />
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{s.label}</Text>
                  </View>
                  {!isLast && <View style={[styles.stepLine, i < currentStage && styles.stepLineDone]} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        <View style={styles.note}>
          <Text style={type.small}>
            Showing a route preview — the phone build renders this over a live OpenStreetMap view with an
            animated rider marker.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 260 },
  mapBox: { flex: 1, overflow: "hidden" },
  topRow: {
    position: "absolute",
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.ink,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    gap: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.turmeric },
  livePillText: { color: colors.paper, fontFamily: fonts.displayBold, fontSize: 12 },
  wrap: { flex: 1, padding: spacing.lg, marginTop: -20 },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    padding: spacing.lg,
  },
  riderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  riderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.turmeric,
    alignItems: "center",
    justifyContent: "center",
  },
  riderAvatarText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 16 },
  stepper: { flexDirection: "row", alignItems: "flex-start" },
  step: { alignItems: "center", width: 68 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.stoneLine, marginBottom: 6 },
  stepDotDone: { backgroundColor: colors.ink },
  stepLabel: { fontSize: 10.5, color: colors.stone, textAlign: "center" },
  stepLabelDone: { color: colors.ink, fontFamily: fonts.display },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.stoneLine, marginTop: 4 },
  stepLineDone: { backgroundColor: colors.ink },
  note: { marginTop: spacing.lg, paddingHorizontal: spacing.sm },
});
