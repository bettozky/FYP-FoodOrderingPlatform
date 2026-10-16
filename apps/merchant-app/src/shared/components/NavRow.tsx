import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadow, spacing } from "../theme/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string; // icon colour; the chip behind it is a 12% wash of it
  title: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
};

export default function NavRow({ icon, tint, title, subtitle, badge, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed, hovered }: any) => [styles.row, hovered && styles.hover, pressed && { opacity: 0.8 }]}>
      <View style={[styles.chip, { backgroundColor: tint + "1F" }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  hover: { transform: [{ translateY: -1 }] },
  chip: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.ink },
  sub: { fontSize: 12.5, fontFamily: fonts.serif, color: colors.stone, marginTop: 1 },
  badge: { minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 12, fontFamily: fonts.displayExtraBold, color: colors.ink },
});
