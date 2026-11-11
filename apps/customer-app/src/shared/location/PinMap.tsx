import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { UrlTile } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../theme/theme";

export type PinMapProps = {
  /** Where the map starts, and where it moves when `focusKey` changes. */
  lat: number;
  lng: number;
  /** Change this number to move the map to lat / lng (for example after the customer picks a search result). */
  focusKey: number;
  /** Called after the customer drags or zooms the map: the point under the pin. */
  onMove: (lat: number, lng: number) => void;
  height?: number;
};

/** Grab-style picker map: the pin stays in the middle and the customer moves the map underneath it. */
export default function PinMap({ lat, lng, focusKey, onMove, height = 280 }: PinMapProps) {
  const ref = useRef<MapView>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    ref.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 350);
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[styles.box, { height }]} testID="pin-map">
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
        onRegionChangeComplete={(r) => onMove(r.latitude, r.longitude)}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
      </MapView>
      <View pointerEvents="none" style={styles.pinWrap}>
        <Ionicons name="location-sharp" size={44} color={colors.chili} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.paperDim },
  // The tip of the pin sits exactly on the centre of the map.
  pinWrap: { position: "absolute", top: "50%", left: "50%", marginLeft: -22, marginTop: -42 },
});
