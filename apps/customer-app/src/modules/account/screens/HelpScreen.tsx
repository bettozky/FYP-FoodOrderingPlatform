import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { colors, font, radius, spacing, type, layout, ui } from "../../../shared/theme/theme";

// Answers describe how the app really behaves (taken from the order/tracking screens). No contact
// details are listed because the app has no support channel to point to.
// The questions and answers are in the language files under help.q1 / help.a1 ... help.q8 / help.a8.
const FAQ = [
  { q: "help.q1", a: "help.a1" },
  { q: "help.q2", a: "help.a2" },
  { q: "help.q3", a: "help.a3" },
  { q: "help.q4", a: "help.a4" },
  { q: "help.q5", a: "help.a5" },
  { q: "help.q6", a: "help.a6" },
  { q: "help.q7", a: "help.a7" },
  { q: "help.q8", a: "help.a8" },
] as const;

export default function HelpScreen() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("menu.help")} subtitle={t("help.subtitle")} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.group}>
          {FAQ.map((f, i) => {
            const on = open === i;
            return (
              <Pressable key={f.q} onPress={() => setOpen(on ? null : i)} style={({ pressed }) => [styles.card, i > 0 && styles.line, pressed && { backgroundColor: colors.paperDim }]} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={t(f.q)} testID={`faq-${i + 1}`}>
                <View style={styles.row}>
                  <Text style={[type.body, { flex: 1, ...font.displayBold }]}>{t(f.q)}</Text>
                  <Ionicons name={on ? "chevron-up" : "chevron-down"} size={17} color={colors.stoneText} />
                </View>
                {on ? <Text style={[type.bodyMuted, { marginTop: spacing.sm, fontSize: 15, lineHeight: 21 }]}>{t(f.a)}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingVertical: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  group: { ...ui.group },
  card: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56, justifyContent: "center" },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
