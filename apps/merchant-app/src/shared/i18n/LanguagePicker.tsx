import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../modules/auth/AuthContext";
import { colors, fonts, radius } from "../theme/theme";
import { currentLanguage, LANGUAGES } from "./index";

/**
 * EN · BM · 中文 buttons to choose the app language (login screen, waiting-for-approval screen and the side menu).
 * Each name is written in its own language so anyone can find theirs.
 * The choice is saved on the account (PATCH /auth/me) when signed in, so it follows the owner to another phone.
 */
export default function LanguagePicker({ style }: { style?: object }) {
  const { t } = useTranslation();
  const { changeLanguage } = useAuth();
  const current = currentLanguage();
  return (
    <View style={[s.pills, style]} accessibilityRole="radiogroup" accessibilityLabel={t("language.title")}>
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

const s = StyleSheet.create({
  pills: { flexDirection: "row", alignSelf: "flex-start", gap: 4, backgroundColor: colors.paperDim, borderRadius: radius.pill, padding: 3 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, minWidth: 44, alignItems: "center" },
  pillOn: { backgroundColor: colors.ink },
  pillText: { fontFamily: fonts.displayBold, fontSize: 12.5, color: colors.ink },
  pillTextOn: { color: colors.white },
});
