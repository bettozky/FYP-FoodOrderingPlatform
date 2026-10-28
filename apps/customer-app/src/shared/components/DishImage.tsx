import React, { useState } from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../theme/theme";
import { isPhoto, mediaUrl } from "../media";

// The one picture used for a dish everywhere (cards, stall menu, dish detail, cart, tracking).
// `image` is what the backend sends for a dish: "/media/..." (a photo the backend serves) or an https link.
// Photos fill the shape. With no photo, or if it fails to load, a plain plate icon sits on a soft tint,
// so a card never looks broken.
type Shape = "tile" | "circle" | "hero";

type Props = {
  image?: string;
  /** Width and height in px. "hero" ignores it and fills its parent's width. */
  size?: number;
  shape?: Shape;
  /** Background behind an emoji. Defaults to the amber tint. */
  tint?: string;
  /** Read by screen readers, e.g. the dish name. */
  label?: string;
  /** Small dim overlay with text, e.g. "Sold out". */
  overlay?: string;
  style?: ViewStyle;
};

/** Light background from a stall's brand colour (#RRGGBB → 15% opacity), or the amber tint. */
export const softTint = (hex?: string) => (hex && /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}26` : colors.amberTint);

export default function DishImage({ image, size = 64, shape = "tile", tint = colors.amberTint, label, overlay, style }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = mediaUrl(image);
  const photo = isPhoto(uri) && !failed;
  const box: ViewStyle =
    shape === "hero"
      ? { width: "100%", aspectRatio: 1.6, borderRadius: 0 }
      : { width: size, height: size, borderRadius: shape === "circle" ? size / 2 : Math.min(radius.md, size / 4) };
  const emojiSize = shape === "hero" ? 96 : Math.round(size * 0.48);

  return (
    <View
      style={[styles.base, box, { backgroundColor: photo ? colors.paperDim : tint }, style]}
      accessible={!!label}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
    >
      {photo ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : image && !isPhoto(uri) && !image.startsWith("/") ? (
        <Text style={{ fontSize: emojiSize }} allowFontScaling={false}>{image}</Text>
      ) : (
        <Ionicons name="restaurant-outline" size={Math.round(emojiSize * 0.9)} color={colors.stoneText} />
      )}
      {overlay ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <Text style={styles.overlayText}>{overlay}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  overlay: { backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center" },
  overlayText: { color: colors.white, fontSize: 11, fontFamily: fonts.displayBold, textAlign: "center", paddingHorizontal: 4 },
});
