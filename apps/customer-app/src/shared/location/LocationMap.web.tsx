import React from "react";
import { View } from "react-native";
import { colors, radius } from "../theme/theme";

/** Browser build: an OpenStreetMap embed with the customer's pin (react-native-maps has no web renderer). */
export default function LocationMap({ lat, lng, height = 150 }: { lat: number; lng: number; height?: number }) {
  const d = 0.003;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <View style={{ height, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.paperDim }} testID="location-map">
      {React.createElement("iframe", { src, title: "Your location on the map", style: { border: 0, width: "100%", height: "100%" }, loading: "lazy" })}
    </View>
  );
}
