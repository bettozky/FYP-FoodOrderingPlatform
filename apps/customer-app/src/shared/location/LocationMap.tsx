import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { colors, radius } from "../theme/theme";

/** A small OpenStreetMap view with one pin, used to show where the customer is. */
export default function LocationMap({ lat, lng, height = 150 }: { lat: number; lng: number; height?: number }) {
  const region = { latitude: lat, longitude: lng, latitudeDelta: 0.006, longitudeDelta: 0.006 };
  return (
    <View style={[styles.box, { height }]}>
      <MapView style={StyleSheet.absoluteFill} region={region} pitchEnabled={false} rotateEnabled={false}>
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        <Marker coordinate={{ latitude: lat, longitude: lng }} title="You are here" pinColor={colors.turmeric} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.paperDim },
});
