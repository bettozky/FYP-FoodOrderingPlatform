import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import L from "leaflet";
import { LEAFLET_CSS } from "./leafletCss";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../theme/theme";
import type { PinMapProps } from "./PinMap";

function addLeafletCss() {
  if (typeof document === "undefined" || document.getElementById("leaflet-css")) return;
  const el = document.createElement("style");
  el.id = "leaflet-css";
  el.textContent = LEAFLET_CSS;
  document.head.appendChild(el);
}

/** Browser build of the picker map (react-native-maps has no web renderer): Leaflet with OpenStreetMap tiles. */
export default function PinMap({ lat, lng, focusKey, onMove, height = 280 }: PinMapProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  useEffect(() => {
    if (!host.current || map.current) return;
    addLeafletCss();
    const m = L.map(host.current, { zoomControl: true, attributionControl: true }).setView([lat, lng], 17);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(m);
    m.on("moveend", () => { const c = m.getCenter(); moveRef.current(c.lat, c.lng); });
    map.current = m;
    const t = setTimeout(() => m.invalidateSize(), 250); // the picker opens inside a modal that is still sizing itself
    return () => { clearTimeout(t); m.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    map.current?.setView([lat, lng], Math.max(map.current.getZoom(), 16), { animate: true });
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ height, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.paperDim }} testID="pin-map">
      {React.createElement("div", { ref: host, style: { width: "100%", height: "100%" } })}
      <View pointerEvents="none" style={{ position: "absolute", top: "50%", left: "50%", marginLeft: -22, marginTop: -42, zIndex: 1000 }}>
        <Ionicons name="location-sharp" size={44} color={colors.chili} />
      </View>
    </View>
  );
}
