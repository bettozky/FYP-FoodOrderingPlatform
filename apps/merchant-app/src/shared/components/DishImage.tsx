import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../theme/theme";
import { isPhoto, mediaUrl } from "../media";

// A dish picture for the merchant's menu list. Shows the photo; with no photo (or a broken link) a plate icon.
export default function DishImage({ image, size = 56 }: { image?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const uri = mediaUrl(image);
  const photo = isPhoto(uri) && !failed;
  const emoji = !!image && !photo && !isPhoto(uri) && !image.startsWith("/");
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: Math.min(radius.md, size / 4) }]}>
      {photo ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      ) : emoji ? (
        <Text style={{ fontSize: size * 0.5 }} allowFontScaling={false}>{image}</Text>
      ) : (
        <Ionicons name="restaurant-outline" size={Math.round(size * 0.45)} color={colors.stone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
