import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import MapView, { UrlTile, AnimatedRegion, MarkerAnimated, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ScreenHeader";
import { activeOrder } from "../../data/mockData";
import {
  assignOrder,
  fetchTracking,
  DELIVERY_DESTINATION,
  Tracking,
  DeliveryStatus,
} from "../../data/deliveryApi";
import { colors, radius, spacing, type, fonts, shadow } from "../../theme/theme";

// This is the real, live GPS map — same data contract as the GPS Logistics
// backend demo. Point src/data/deliveryApi.ts's API_BASE at that server to
// see actual rider hardware/simulator movement here instead of the
// built-in local simulation.

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

const INITIAL_REGION = {
  latitude: 1.5533,
  longitude: 110.3592,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

const POLL_MS = 1000;

export default function LiveTrackingScreen({ navigation }: any) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const region = useRef(new AnimatedRegion(INITIAL_REGION)).current;

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
    applyTracking(t);
    pollRef.current = setInterval(poll, POLL_MS);
  }

  async function poll() {
    const t = await fetchTracking(activeOrder.id);
    if (t) applyTracking(t);
    if (t?.status === "delivered" && pollRef.current) {
      clearInterval(pollRef.current);
    }
  }

  function applyTracking(t: Tracking) {
    setTracking(t);
    if (t.rider) {
      region
        .timing({
          latitude: t.rider.lat,
          longitude: t.rider.lng,
          latitudeDelta: INITIAL_REGION.latitudeDelta,
          longitudeDelta: INITIAL_REGION.longitudeDelta,
          duration: POLL_MS,
          useNativeDriver: false,
        } as any)
        .start();
    }
  }

  const currentStage = tracking ? stageIndex(tracking.status) : -1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Live tracking" subtitle={`Order #${activeOrder.id}`} />

      <View style={styles.mapWrap}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={INITIAL_REGION}>
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />

          {tracking?.rider && (
            <MarkerAnimated coordinate={region as any} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.riderDot}>
                <Text style={styles.riderDotText}>{tracking.rider.name.charAt(0)}</Text>
              </View>
            </MarkerAnimated>
          )}

          <Marker
            coordinate={{ latitude: DELIVERY_DESTINATION.lat, longitude: DELIVERY_DESTINATION.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.destinationPin, { backgroundColor: colors.ink }]}>
              <Ionicons name="storefront" size={14} color={colors.white} />
            </View>
          </Marker>
        </MapView>

        {!tracking && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={colors.turmeric} />
          </View>
        )}

        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.livePillText}>Live</Text>
        </View>
      </View>

      <View style={[styles.sheet, shadow.sheet]}>
        <View style={styles.riderRow}>
          <View style={styles.riderAvatar}>
            <Text style={styles.riderAvatarText}>{tracking?.rider ? tracking.rider.name.charAt(0) : "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>{tracking?.rider ? tracking.rider.name : "Finding a rider…"}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { flex: 1 },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  livePill: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
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
  riderDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.turmeric,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
    ...shadow.floating,
  },
  riderDotText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 13 },
  destinationPin: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.chili,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
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
  riderName: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  stepper: { flexDirection: "row", alignItems: "flex-start" },
  step: { alignItems: "center", width: 68 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.stoneLine, marginBottom: 6 },
  stepDotDone: { backgroundColor: colors.ink },
  stepLabel: { fontSize: 10.5, color: colors.stone, textAlign: "center" },
  stepLabelDone: { color: colors.ink, fontFamily: fonts.display },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.stoneLine, marginTop: 4 },
  stepLineDone: { backgroundColor: colors.ink },
});
