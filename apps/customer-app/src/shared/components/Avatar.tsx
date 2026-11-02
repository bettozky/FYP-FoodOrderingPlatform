import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme/theme";
import { isPhoto, mediaUrl } from "../media";

/** A round profile picture: the uploaded photo, an emoji, or the first letter of the name. */
export default function Avatar({ uri, name, size = 52 }: { uri?: string | null; name?: string; size?: number }) {
  const src = mediaUrl(uri ?? undefined);
  const radius = size / 2;
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius }]} accessibilityLabel={name ? `${name}'s profile picture` : "Profile picture"}>
      {isPhoto(src) ? (
        <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: radius }} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{uri && !uri.startsWith("/") && !uri.startsWith("http") ? uri : (name || "S")[0].toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  letter: { fontFamily: fonts.displayBold, color: colors.ink },
});
