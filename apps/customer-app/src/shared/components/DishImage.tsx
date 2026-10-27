import React, { useState } from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fonts, radius } from "../theme/theme";

// The one picture used for a dish everywhere (cards, stall menu, dish detail, cart, tracking).
// `image` is what the backend sends for a dish: a photo URL once real pictures are uploaded,
// or an emoji in the seed data today. Photos fill the shape; an emoji sits on a soft tint.
// If a photo fails to load, the tint is shown instead, so a card never looks broken.
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

export const isPhoto = (image?: string) => !!image && /^(https?:|data:image\/|file:|blob:)/.test(image);

export default function DishImage({ image, size = 64, shape = "tile", tint = colors.amberTint, label, overlay, style }: Props) {
  const [failed, setFailed] = useState(false);
  const photo = isPhoto(image) && !failed;
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
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : image && !isPhoto(image) ? (
        <Text style={{ fontSize: emojiSize }} allowFontScaling={false}>{image}</Text>
      ) : null}
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
