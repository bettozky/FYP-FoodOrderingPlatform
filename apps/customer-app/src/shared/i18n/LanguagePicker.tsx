import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../modules/auth/AuthContext";
import { colors, fonts, radius, spacing, type } from "../theme/theme";
import { currentLanguage, LANGUAGES } from "./index";

/**
 * Choose the app language. Each name is written in its own language so anyone can find theirs.
 *   variant="list"    : a card with three rows (Account screen)
 *   variant="compact" : EN · BM · 中文 pills on a dark background (login screen)
 * The choice is saved on the account (PATCH /auth/me) when signed in, so it follows the user to another phone.
 */
export default function LanguagePicker({ variant = "list" }: { variant?: "list" | "compact" }) {
  const { t } = useTranslation();
  const { changeLanguage } = useAuth();
  const current = currentLanguage();

  if (variant === "compact") {
    return (
      <View style={s.pills} accessibilityRole="radiogroup" accessibilityLabel={t("language.title")}>
        {LANGUAGES.map((l) => {
          const on = l.code === current;
          return (
            <Pressable key={l.code} onPress={() => changeLanguage(l.code)} style={[s.pill, on && s.pillOn]} hitSlop={6}
              accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={l.label} testID={`lang-${l.code}`}>
              <Text style={[s.pillText, on && s.pillTextOn]}>{l.short}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={s.card} accessibilityRole="radiogroup" accessibilityLabel={t("language.title")}>
      {LANGUAGES.map((l, i) => {
        const on = l.code === current;
        return (
          <Pressable key={l.code} onPress={() => changeLanguage(l.code)} style={[s.row, i > 0 && s.rowLine]}
            accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={l.label} testID={`lang-${l.code}`}>
            <Text style={[type.body, { flex: 1 }, on && { fontFamily: fonts.displayBold }]}>{l.label}</Text>
            <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.turmericDeep : colors.stone} />
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  pills: { flexDirection: "row", gap: 6, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: radius.pill, padding: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, minWidth: 44, alignItems: "center" },
  pillOn: { backgroundColor: colors.turmeric },
  pillText: { fontFamily: fonts.displayBold, fontSize: 12.5, color: "rgba(255,255,255,0.85)" },
  pillTextOn: { color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, minHeight: 50 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
});
