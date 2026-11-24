import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../shared/api/client";
import { colors, layout, radius, spacing, font } from "../../shared/theme/theme";
import type { Announcement } from "./AnnouncementsScreen";
import i18n from "../../shared/i18n";

/** A slim card on Home showing the newest (pinned first) announcement. Hidden when there is none. */
export default function AnnouncementStrip({ onOpen }: { onOpen: () => void }) {
  const [top, setTop] = useState<Announcement | null>(null);
  useEffect(() => {
    api<{ announcements: Announcement[] }>("GET", "/announcements").then((r) => setTop(r.announcements[0] ?? null)).catch(() => {});
  }, []);
  if (!top) return null;
  return (
    <Pressable style={styles.card} onPress={onOpen} accessibilityRole="button" accessibilityLabel={i18n.t("news.stripLabel", { title: top.title })} testID="announcement-strip">
      <Ionicons name="megaphone-outline" size={20} color={colors.amberText} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>{top.title}</Text>
        <Text style={styles.body} numberOfLines={1}>{top.body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.stone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: layout.gutter, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.amberTint, borderWidth: 1, borderColor: colors.amberBorder },
  title: { ...font.displayBold, fontSize: 15, color: colors.ink },
  body: { ...font.serif, fontSize: 14, color: colors.stoneText },
});
