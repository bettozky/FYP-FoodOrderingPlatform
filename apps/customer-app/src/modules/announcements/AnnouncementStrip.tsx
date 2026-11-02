import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../shared/api/client";
import { colors, fonts, radius, spacing } from "../../shared/theme/theme";
import type { Announcement } from "./AnnouncementsScreen";

/** A slim card on Home showing the newest (pinned first) announcement. Hidden when there is none. */
export default function AnnouncementStrip({ onOpen }: { onOpen: () => void }) {
  const [top, setTop] = useState<Announcement | null>(null);
  useEffect(() => {
    api<{ announcements: Announcement[] }>("GET", "/announcements").then((r) => setTop(r.announcements[0] ?? null)).catch(() => {});
  }, []);
  if (!top) return null;
  return (
    <Pressable style={styles.card} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Announcement: ${top.title}. Open all announcements`} testID="announcement-strip">
      <Ionicons name="megaphone" size={18} color={colors.amberText} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>{top.title}</Text>
        <Text style={styles.body} numberOfLines={1}>{top.body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.stone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.amberTint, borderWidth: 1, borderColor: colors.amberBorder },
  title: { fontFamily: fonts.displayBold, fontSize: 13.5, color: colors.ink },
  body: { fontFamily: fonts.display, fontSize: 12, color: colors.stoneText },
});
