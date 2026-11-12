import React from "react";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

// Cute flat food icons for the Home category panel (hand-drawn in a 48 x 48 box, no glow, no tile behind them).
// To add a category icon: add a name to IconKind, draw it in `art`, and map a category label to it in lookFor (CategoryGrid.tsx).
export type IconKind =
  | "trending" | "halal" | "buffet" | "western" | "luxury" | "cafe" | "rice" | "noodles" | "chicken" | "snacks"
  | "drinks" | "dessert" | "healthy" | "book" | "jobs" | "saved" | "map" | "plate";

function art(kind: IconKind): React.ReactNode {
  switch (kind) {
    case "trending":
      return (
        <>
      <Rect x="5" y="30" width="11" height="13" rx="4" fill="#FFB5A3" /><Rect x="18.500" y="12" width="11" height="31" rx="4" fill="#E8483A" /><Rect x="32" y="22" width="11" height="21" rx="4" fill="#FF7A5C" /><Rect x="21" y="16" width="3" height="9" rx="1.500" fill="#FFFFFF" opacity=".55" /><Rect x="7.500" y="33" width="2.500" height="5" rx="1.200" fill="#FFFFFF" opacity=".6" /><Rect x="34.500" y="25" width="2.500" height="8" rx="1.200" fill="#FFFFFF" opacity=".55" />
        </>
      );
    case "halal":
      return (
        <>
      <Circle cx="24" cy="24" r="20" fill="#2FB36D" /><Circle cx="24" cy="24" r="17" fill="none" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="1.500" strokeDasharray="2 3" /><Circle cx="21" cy="25" r="9.500" fill="#FFFFFF" /><Circle cx="25" cy="23" r="8.500" fill="#2FB36D" /><Path d="M32 12l1.400 3 3.300.3-2.500 2.200.8 3.200-3-1.800-3 1.800.8-3.200-2.500-2.200 3.300-.3z" fill="#FFE066" /><Ellipse cx="15" cy="13" rx="6" ry="3" rotation={-35} origin="15, 13" fill="#FFFFFF" opacity=".3" />
        </>
      );
    case "buffet":
      return (
        <>
      <Ellipse cx="24" cy="39" rx="20" ry="4" fill="#CFC9BA" /><Rect x="4" y="34" width="40" height="5" rx="2.500" fill="#B8B2A3" /><Path d="M8 34a16 16 0 0 1 32 0z" fill="#FFC857" /><Path d="M8 34h32" stroke="#E8A21C" strokeWidth="2" /><Circle cx="24" cy="15" r="3.200" fill="#E8A21C" /><Path d="M13 29a11 11 0 0 1 6-10" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".75" />
        </>
      );
    case "western":
      return (
        <>
      <Path d="M6 24c0-9 7-15 18-15s18 6 18 15v2H6z" fill="#F0B35A" /><Ellipse cx="17" cy="16" rx="2.300" ry="1.200" fill="#FFF3D0" rotation={-20} origin="17, 16" /><Ellipse cx="25" cy="13" rx="2.300" ry="1.200" fill="#FFF3D0" /><Ellipse cx="32" cy="17" rx="2.300" ry="1.200" fill="#FFF3D0" rotation={20} origin="32, 17" /><Path d="M5 27c3 3 6-3 9 0s6-3 9 0 6-3 9 0 6-3 9 0" stroke="#6CCB5F" strokeWidth="4" fill="none" strokeLinecap="round" /><Path d="M7 31h34l-3.500 5-4-3-5 4-5-4-5 3-4-3z" fill="#FFD23F" /><Rect x="5" y="32" width="38" height="6" rx="3" fill="#7A4A2A" /><Path d="M7 39h34v1a6 6 0 0 1-6 6H13a6 6 0 0 1-6-6z" fill="#E9A648" />
        </>
      );
    case "luxury":
      return (
        <>
      <Path d="M12 8h24l8 10H4z" fill="#D8C0FF" /><Path d="M4 18h40L24 43z" fill="#9B6BFF" /><Path d="M18 18l6 25 6-25" stroke="#C9A9FF" strokeWidth="2" fill="none" strokeLinejoin="round" /><Path d="M18 8l-5 10M30 8l5 10M18 8l6 10 6-10" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="1.600" fill="none" strokeLinejoin="round" /><Path d="M10 20.500l6 8" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="2.500" strokeLinecap="round" />
        </>
      );
    case "cafe":
      return (
        <>
      <Path d="M15 13c-2-3 2-4 0-8M22 13c-2-3 2-4 0-8M29 13c-2-3 2-4 0-8" stroke="#BDB6A8" strokeWidth="2.200" fill="none" strokeLinecap="round" /><Ellipse cx="22" cy="42" rx="19" ry="3.500" fill="#E5D8C6" /><Path d="M7 19h30v9a14 14 0 0 1-14 14h-2A14 14 0 0 1 7 28z" fill="#C98B5B" /><Path d="M37 22h2a5 5 0 0 1 0 10h-4" stroke="#C98B5B" strokeWidth="3.500" fill="none" strokeLinecap="round" /><Ellipse cx="22" cy="19" rx="15" ry="3.500" fill="#6F4426" /><Path d="M22 21.500s-3.500-2-3.500-3.800a1.800 1.800 0 0 1 3.500-.5 1.800 1.800 0 0 1 3.500.5c0 1.800-3.500 3.800-3.500 3.800z" fill="#F4D9B8" /><Rect x="10" y="24" width="3" height="8" rx="1.500" fill="#FFFFFF" opacity=".4" />
        </>
      );
    case "rice":
      return (
        <>
      <Path d="M31 3l-8 20M36 6l-8 19" stroke="#8E5A34" strokeWidth="2.600" strokeLinecap="round" /><Path d="M4 26h40a20 20 0 0 1-40 0z" fill="#3B82E8" /><Path d="M8 26a16 12 0 0 1 32 0z" fill="#FFFFFF" stroke="#E7E2D6" strokeWidth="1.500" /><Ellipse cx="18" cy="21" rx="1.500" ry=".8" fill="#E7E2D6" /><Ellipse cx="25" cy="18" rx="1.500" ry=".8" fill="#E7E2D6" /><Ellipse cx="31" cy="22" rx="1.500" ry=".8" fill="#E7E2D6" /><Path d="M10 34h28" stroke="#9CC4FF" strokeWidth="2.200" strokeLinecap="round" /><Circle cx="19" cy="38.500" r="1.400" fill="#9CC4FF" /><Circle cx="29" cy="38.500" r="1.400" fill="#9CC4FF" />
        </>
      );
    case "noodles":
      return (
        <>
      <Path d="M31 3l-8 20M36 6l-8 19" stroke="#8E5A34" strokeWidth="2.600" strokeLinecap="round" /><Path d="M7 27c1.500-9 6-9 8 0M15 27c1.500-11 6-11 8 0M23 27c1.500-9 6-9 8 0M31 27c1.500-9 6-9 8 0" stroke="#FFD866" strokeWidth="3.400" fill="none" strokeLinecap="round" /><Path d="M4 26h40a20 20 0 0 1-40 0z" fill="#F5922F" /><Circle cx="30" cy="25" r="5.500" fill="#FFFFFF" /><Circle cx="30" cy="25" r="2.600" fill="#FFB020" /><Path d="M10 34h28" stroke="#FFC48A" strokeWidth="2.200" strokeLinecap="round" />
        </>
      );
    case "chicken":
      return (
        <>
      <Path d="M20 30l-9 10" stroke="#FFF4DC" strokeWidth="5.500" strokeLinecap="round" /><Circle cx="8.500" cy="39.500" r="3.400" fill="#FFF4DC" /><Circle cx="12" cy="43.500" r="3.400" fill="#FFF4DC" /><Ellipse cx="29" cy="19" rx="15" ry="12.500" rotation={38} origin="29, 19" fill="#E59A3C" /><Path d="M21 12a9 6.500 0 0 1 9-4" stroke="#FFD58A" strokeWidth="3.200" strokeLinecap="round" fill="none" /><Circle cx="33" cy="23" r="1.300" fill="#C97A22" /><Circle cx="28" cy="27" r="1.300" fill="#C97A22" /><Circle cx="37" cy="16" r="1.300" fill="#C97A22" />
        </>
      );
    case "snacks":
      return (
        <>
      <Rect x="10" y="9" width="5.500" height="20" rx="2.700" fill="#FFD23F" /><Rect x="16.500" y="4" width="5.500" height="25" rx="2.700" fill="#FFC21A" /><Rect x="23" y="8" width="5.500" height="21" rx="2.700" fill="#FFD23F" /><Rect x="29.500" y="3" width="5.500" height="26" rx="2.700" fill="#FFC21A" /><Rect x="35" y="10" width="4.500" height="19" rx="2.200" fill="#FFD23F" /><Path d="M8 24h32l-3.500 21h-25z" fill="#E8483A" /><Circle cx="19" cy="32" r="1.600" fill="#FFFFFF" /><Circle cx="29" cy="32" r="1.600" fill="#FFFFFF" /><Path d="M20 36.500q4 3 8 0" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" /><Rect x="12" y="27" width="3" height="10" rx="1.500" fill="#FFFFFF" opacity=".35" />
        </>
      );
    case "drinks":
      return (
        <>
      <Path d="M29 11l4-9" stroke="#FF6FA8" strokeWidth="3.500" strokeLinecap="round" /><Path d="M12 15h24l-2.500 26a3.500 3.500 0 0 1-3.500 3H18a3.500 3.500 0 0 1-3.500-3z" fill="#EBC49A" /><Path d="M13.500 30h21l-1 11a3.500 3.500 0 0 1-3.500 3H18a3.500 3.500 0 0 1-3.500-3z" fill="#D9A877" /><Rect x="9" y="10" width="30" height="6.500" rx="3.200" fill="#FFFFFF" stroke="#D9D4C7" strokeWidth="1.500" /><Circle cx="19" cy="40" r="2.500" fill="#4A2C1C" /><Circle cx="25" cy="41" r="2.500" fill="#4A2C1C" /><Circle cx="30" cy="38.500" r="2.500" fill="#4A2C1C" /><Circle cx="21" cy="21.500" r="1.500" fill="#4A2C1C" /><Circle cx="29" cy="21.500" r="1.500" fill="#4A2C1C" /><Path d="M23 24.500q2 2 4 0" stroke="#4A2C1C" strokeWidth="1.500" fill="none" strokeLinecap="round" /><Circle cx="17" cy="25" r="2" fill="#FF8FA3" opacity=".6" /><Circle cx="33" cy="25" r="2" fill="#FF8FA3" opacity=".6" />
        </>
      );
    case "dessert":
      return (
        <>
      <Circle cx="24" cy="7" r="3.500" fill="#E8352E" /><Path d="M24 4c1-2 3-3 5-2" stroke="#4F9A3E" strokeWidth="1.800" fill="none" strokeLinecap="round" /><Path d="M14 25h20L24 46z" fill="#E8B26A" /><Path d="M18 29l6 13M30 29l-6 13M15.500 33h17" stroke="#C98B3E" strokeWidth="1.500" /><Circle cx="24" cy="18" r="11.500" fill="#FF9EC4" /><Path d="M12.500 21a11.500 11.500 0 0 0 23 0v3a4 4 0 0 1-8 0 4 4 0 0 1-7 0 4 4 0 0 1-8 0z" fill="#FF7FB0" /><Path d="M16 15a8 8 0 0 1 5-5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".65" />
        </>
      );
    case "healthy":
      return (
        <>
      <Path d="M7 25c0-8 6-11 10-7 2-6 11-6 13 0 4-3 11-1 11 7z" fill="#4CB05B" /><Circle cx="30" cy="20" r="4.500" fill="#E8483A" /><Circle cx="17" cy="21" r="3.600" fill="#FFB020" /><Path d="M24 14c2 2 2 5 0 7" stroke="#2F8A3E" strokeWidth="2" fill="none" strokeLinecap="round" /><Path d="M4 25h40a20 20 0 0 1-40 0z" fill="#8ED1B0" /><Path d="M10 34h28" stroke="#C5EBD7" strokeWidth="2.200" strokeLinecap="round" />
        </>
      );
    case "book":
      return (
        <>
      <Path d="M14 5v8M34 5v8" stroke="#C93E7F" strokeWidth="4" strokeLinecap="round" /><Rect x="5" y="9" width="38" height="34" rx="8" fill="#FFFFFF" stroke="#F36BA5" strokeWidth="3" /><Path d="M5 19h38v-2a8 8 0 0 0-8-8H13a8 8 0 0 0-8 8z" fill="#F36BA5" /><Path d="M15 31l6.500 6.500L34 25" stroke="#F36BA5" strokeWidth="4.500" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "jobs":
      return (
        <>
      <Rect x="5" y="14" width="38" height="28" rx="7" fill="#19B5A5" /><Path d="M17 14v-3a3.500 3.500 0 0 1 3.500-3.500h7A3.500 3.500 0 0 1 31 11v3" stroke="#0E8478" strokeWidth="3.500" fill="none" strokeLinecap="round" /><Path d="M5 26h38" stroke="#0E8478" strokeWidth="2.500" /><Rect x="20" y="23" width="8" height="7" rx="2" fill="#FFC93C" /><Rect x="9" y="17" width="13" height="3" rx="1.500" fill="#FFFFFF" opacity=".45" />
        </>
      );
    case "saved":
      return (
        <>
      <Path d="M24 43S4 31 4 17a10.500 10.500 0 0 1 20-4.500A10.500 10.500 0 0 1 44 17c0 14-20 26-20 26z" fill="#FF5A6E" /><Path d="M10 16a6 6 0 0 1 6-6" stroke="#FFFFFF" strokeWidth="3.200" strokeLinecap="round" fill="none" opacity=".7" />
        </>
      );
    case "map":
      return (
        <>
      <Path d="M5 12l12-5 14 5 12-5v28l-12 5-14-5-12 5z" fill="#5BD9C9" />
      <Path d="M5 12l12-5v28L5 40z" fill="#3CC2B0" />
      <Path d="M31 12v28" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.600" />
      <Path d="M17 7v28" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.600" />
      <Path d="M33 8c-4.500 0-7.500 3.300-7.500 7.300 0 5 7.500 11.500 7.500 11.500s7.500-6.500 7.500-11.500C40.500 11.300 37.500 8 33 8z" fill="#E8483A" />
      <Circle cx="33" cy="15" r="2.800" fill="#FFFFFF" />
        </>
      );
    case "plate":
      return (
        <>
      <Circle cx="24" cy="25" r="19" fill="#FFFFFF" stroke="#E7DFCB" strokeWidth="3" />
      <Circle cx="24" cy="25" r="12" fill="#FFF3D6" stroke="#F0D9A0" strokeWidth="1.600" />
      <Path d="M20 17v16M17 17v5a3 3 0 0 0 6 0v-5" stroke="#B7791F" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M30 33V17c-2.500 1.500-3.500 4.500-3.500 8H30" stroke="#B7791F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
  }
}

export default function CuteIcon({ kind, size = 56 }: { kind: IconKind; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      {art(kind)}
    </Svg>
  );
}
