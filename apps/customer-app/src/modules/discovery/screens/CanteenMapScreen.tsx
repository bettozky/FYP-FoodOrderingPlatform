import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import EmptyState from "../../../shared/components/EmptyState";
import type { BusyLevel, Merchant } from "../../../shared/api/types";
import { useCatalog } from "../CatalogContext";
import { BUSY_STYLE, buildCanteens, busyOf, waitOf, type Slot } from "../canteenMap";
import { colors, fonts, radius, spacing, type, ui } from "../../../shared/theme/theme";

// Live Canteen Map (feature 1, Nov 2026). Route: navigation.navigate("CanteenMap").
// A floor plan of each canteen: counters along two walls, seating in the middle.
// Each stall glows green, amber or red by its live wait time (from the server, refreshed every 10 s).
// Tap a stall to see its wait and open its menu.
const REFRESH_MS = 10000;

export default function CanteenMapScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { merchants, refreshMerchants, loadError } = useCatalog();
  const canteens = useMemo(() => buildCanteens(merchants), [merchants]);
  const [area, setArea] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(Date.now());

  // Live: refresh the stalls every 10 seconds while the map is open.
  useEffect(() => {
    const tick = () => refreshMerchants().then(() => setUpdatedAt(Date.now()));
    tick();
    const t = setInterval(tick, REFRESH_MS);
    return () => clearInterval(t);
  }, [refreshMerchants]);

  const canteen = canteens.find((c) => c.name === area) ?? canteens[0];
  const selected = merchants.find((m) => m.id === selectedId);

  // Room width: the screen minus side padding, capped so it stays readable on a laptop browser.
  const roomWidth = Math.min(width, 520) - spacing.lg * 2;
  const tileWidth = canteen ? (roomWidth - spacing.md * 2 - spacing.sm * (canteen.perRow - 1)) / canteen.perRow : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Live canteen map" subtitle="Green is quick, red means a longer wait" />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: (selected ? 200 : spacing.xxl) + insets.bottom }]}>
        {canteens.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {canteens.map((c) => {
              const on = c.name === canteen?.name;
              return (
                <Pressable key={c.name} onPress={() => { setArea(c.name); setSelectedId(null); }} style={[ui.chip, on && ui.chipOn]} accessibilityRole="tab" accessibilityState={{ selected: on }} testID={`canteen-${c.name}`}>
                  <Text style={[ui.chipText, on && ui.chipTextOn]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <Legend />

        {!canteen ? (
          <EmptyState icon="map-outline" title="No stalls yet" hint={loadError || "Stalls appear here once they are approved."} />
        ) : (
          <View style={[styles.room, { width: roomWidth }]} accessibilityLabel={`${canteen.name} floor plan`}>
            <Text style={styles.roomName}>{canteen.name}</Text>
            <Row slots={canteen.slots.slice(0, canteen.perRow)} tileWidth={tileWidth} selectedId={selectedId} onPick={setSelectedId} />
            <View style={styles.seating} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: Math.min(6, canteen.perRow + 2) }, (_, i) => (
                <View key={i} style={styles.table}>
                  <Ionicons name="restaurant-outline" size={13} color={colors.stoneSoft} />
                </View>
              ))}
              <Text style={styles.seatingText}>Seating</Text>
            </View>
            <Row slots={canteen.slots.slice(canteen.perRow)} tileWidth={tileWidth} selectedId={selectedId} onPick={setSelectedId} />
            <View style={styles.entrance}>
              <Ionicons name="walk-outline" size={13} color={colors.stoneText} />
              <Text style={styles.entranceText}>Entrance</Text>
            </View>
          </View>
        )}

        <Text style={[type.small, { textAlign: "center", marginTop: spacing.md }]}>
          Live · updated {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · refreshes every 10 s
        </Text>
      </ScrollView>

      {selected ? <StallSheet merchant={selected} bottom={insets.bottom} onClose={() => setSelectedId(null)} onOpen={() => navigation.navigate("Stall", { merchantId: selected.id })} /> : null}
    </View>
  );
}

function Legend() {
  const levels: BusyLevel[] = ["quiet", "busy", "very_busy", "closed"];
  const hint: Record<BusyLevel, string> = { quiet: "≤ 12 min", busy: "13–20 min", very_busy: "20+ min", closed: "" };
  return (
    <View style={styles.legend}>
      {levels.map((l) => (
        <View key={l} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BUSY_STYLE[l].dot }]} />
          <Text style={styles.legendText}>{BUSY_STYLE[l].label}{hint[l] ? ` ${hint[l]}` : ""}</Text>
        </View>
      ))}
    </View>
  );
}

function Row({ slots, tileWidth, selectedId, onPick }: { slots: Slot[]; tileWidth: number; selectedId: string | null; onPick: (id: string) => void }) {
  return (
    <View style={styles.row}>
      {slots.map((s) => (s.merchant ? (
        <StallTile key={s.slot} merchant={s.merchant} slot={s.slot} width={tileWidth} selected={s.merchant.id === selectedId} onPress={() => onPick(s.merchant!.id)} />
      ) : (
        <View key={s.slot} style={[styles.tile, styles.emptyTile, { width: tileWidth }]} accessibilityLabel={`Stall ${s.slot}, empty`}>
          <Text style={styles.emptyText}>{s.slot}</Text>
        </View>
      )))}
    </View>
  );
}

function StallTile({ merchant, slot, width, selected, onPress }: { merchant: Merchant; slot: number; width: number; selected: boolean; onPress: () => void }) {
  const level = busyOf(merchant);
  const style = BUSY_STYLE[level];
  const wait = waitOf(merchant);

  // The "glow": open stalls pulse softly in their colour.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (level === "closed") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [level, pulse]);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, { width, backgroundColor: style.fill, borderColor: selected ? colors.ink : style.border }, selected && styles.tileSelected]}
      accessibilityRole="button"
      accessibilityLabel={`${merchant.name}, stall ${slot}. ${level === "closed" ? "Closed" : `${style.label}, about ${wait} minutes`}`}
      testID={`map-stall-${merchant.id}`}
    >
      {level !== "closed" ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, { borderColor: style.dot, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.7] }) }]} />
      ) : null}
      <View style={styles.tileTop}>
        <View style={[styles.dot, { backgroundColor: style.dot }]} />
        <Text style={styles.slotNo}>{slot}</Text>
      </View>
      <Text style={styles.tileName} numberOfLines={2}>{merchant.name}</Text>
      <Text style={[styles.tileWait, { color: style.text }]} numberOfLines={1}>{level === "closed" ? "Closed" : `${wait} min`}</Text>
    </Pressable>
  );
}

function StallSheet({ merchant, bottom, onClose, onOpen }: { merchant: Merchant; bottom: number; onClose: () => void; onOpen: () => void }) {
  const level = busyOf(merchant);
  const style = BUSY_STYLE[level];
  const queue = merchant.queue ?? 0;
  return (
    <View style={[styles.sheet, { paddingBottom: bottom + spacing.lg }]}>
      <View style={styles.sheetTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={type.h2} numberOfLines={1}>{merchant.name}</Text>
          <Text style={type.small}>{merchant.stallNo}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={ui.iconButton} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={18} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.sheetChips}>
        <View style={[ui.infoChip, { backgroundColor: style.fill }]}>
          <View style={[styles.dot, { backgroundColor: style.dot }]} />
          <Text style={[ui.infoChipText, { color: style.text }]}>{style.label}</Text>
        </View>
        {level === "closed" ? (
          <View style={ui.infoChip}><Text style={ui.infoChipText}>Opens {merchant.hours.open}</Text></View>
        ) : (
          <>
            <View style={ui.infoChip}><Text style={ui.infoChipText}>Ready in about {waitOf(merchant)} min</Text></View>
            <View style={ui.infoChip}><Text style={ui.infoChipText}>{queue === 0 ? "No orders ahead" : `${queue} ${queue === 1 ? "order" : "orders"} ahead`}</Text></View>
          </>
        )}
      </View>
      <Pressable style={ui.buttonAccent} onPress={onOpen} accessibilityRole="button" testID="map-open-stall">
        <Text style={ui.buttonAccentText}>View menu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, alignItems: "center" },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.md },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.md, marginBottom: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: fonts.display, fontSize: 11.5, color: colors.stoneText },
  room: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.stoneLine, padding: spacing.md, gap: spacing.md },
  roomName: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  row: { flexDirection: "row", gap: spacing.sm },
  tile: { minHeight: 86, borderRadius: radius.sm, borderWidth: 1.5, padding: 6, gap: 2, overflow: "hidden" },
  tileSelected: { borderWidth: 2.5 },
  glow: { borderRadius: radius.sm, borderWidth: 3 },
  emptyTile: { borderStyle: "dashed", borderColor: colors.stoneLine, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: fonts.display, fontSize: 11, color: colors.stoneSoft },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  slotNo: { fontFamily: fonts.display, fontSize: 10, color: colors.stoneText },
  tileName: { fontFamily: fonts.displayBold, fontSize: 10.5, lineHeight: 13, color: colors.ink },
  tileWait: { fontFamily: fonts.displayExtraBold, fontSize: 13, marginTop: "auto" },
  seating: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radius.md, backgroundColor: colors.bg },
  table: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.stoneLine, alignItems: "center", justifyContent: "center" },
  seatingText: { width: "100%", textAlign: "center", fontFamily: fonts.display, fontSize: 11, color: colors.stoneSoft },
  entrance: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, alignSelf: "center", paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.paperDim },
  entranceText: { fontFamily: fonts.display, fontSize: 11, color: colors.stoneText },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderColor: colors.stoneLine },
  sheetTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sheetChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
