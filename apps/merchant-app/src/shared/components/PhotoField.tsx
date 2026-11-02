import React, { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme/theme";
import { isPhoto, mediaUrl } from "../media";
import { LocalFile, pickImage } from "../util/files";

/**
 * Photo chooser used for dish photos and shop photos. Shows the current picture (or the one just picked) with
 * "Choose" / "Take photo" / "Remove" buttons. Nothing is uploaded here: the parent decides when to send it.
 */
export default function PhotoField({ current, picked, aspect = [4, 3], label, onPick, onRemove, busy, shape = "rect" }: {
  current?: string; picked?: LocalFile | null; aspect?: [number, number]; label: string; busy?: boolean; shape?: "rect" | "round";
  onPick: (f: LocalFile) => void; onRemove: () => void;
}) {
  const [error, setError] = useState("");
  const src = picked?.uri ?? mediaUrl(current);
  const has = isPhoto(src);
  const choose = async (source: "library" | "camera") => {
    setError("");
    try {
      const f = await pickImage(source, aspect);
      if (f) onPick(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the photo picker.");
    }
  };
  const box = shape === "round" ? { width: 96, height: 96, borderRadius: 48 } : { width: "100%" as const, aspectRatio: aspect[0] / aspect[1], borderRadius: radius.md };
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.preview, box]}>
        {has ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : <Ionicons name="image-outline" size={30} color={colors.stone} />}
      </View>
      <View style={styles.row}>
        <Pressable style={[styles.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => choose("library")} accessibilityRole="button" accessibilityLabel={`Choose ${label} from gallery`} testID="photo-choose">
          <Ionicons name="images-outline" size={16} color={colors.ink} /><Text style={styles.btnText}>{has ? "Change" : "Choose"}</Text>
        </Pressable>
        {Platform.OS !== "web" ? (
          <Pressable style={[styles.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => choose("camera")} accessibilityRole="button" accessibilityLabel={`Take a photo for ${label}`} testID="photo-camera">
            <Ionicons name="camera-outline" size={16} color={colors.ink} /><Text style={styles.btnText}>Take photo</Text>
          </Pressable>
        ) : null}
        {has ? (
          <Pressable style={[styles.btn, styles.remove, busy && { opacity: 0.5 }]} disabled={busy} onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${label}`} testID="photo-remove">
            <Ionicons name="trash-outline" size={16} color={colors.chili} /><Text style={[styles.btnText, { color: colors.chili }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      {picked ? <Text style={styles.note}>New photo selected. It is uploaded when you save.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  preview: { backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: colors.stoneLine },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  btn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  remove: { borderColor: colors.chiliBorder, backgroundColor: colors.chiliSoft },
  btnText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  note: { fontSize: 12, color: colors.stoneText },
  error: { fontSize: 12.5, color: colors.chiliText },
});
