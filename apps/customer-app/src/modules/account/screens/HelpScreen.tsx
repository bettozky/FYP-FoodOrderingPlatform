import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { colors, radius, spacing, type } from "../../../shared/theme/theme";

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
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <Pressable key={f.q} onPress={() => setOpen(on ? null : i)} style={styles.card} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={t(f.q)} testID={`faq-${i + 1}`}>
              <View style={styles.row}>
                <Text style={[type.h3, { flex: 1 }]}>{t(f.q)}</Text>
                <Ionicons name={on ? "chevron-up" : "chevron-down"} size={18} color={colors.ink} />
              </View>
              {on ? <Text style={[type.bodyMuted, { marginTop: spacing.sm }]}>{t(f.a)}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 52, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
