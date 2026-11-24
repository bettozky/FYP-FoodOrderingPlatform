import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { colors, radius, spacing, type, layout } from "../../../shared/theme/theme";

// There is no saved-card feature, so this screen only explains how paying works. Each statement is
// backed by the app/backend: pay-after-confirm (order tracking), simulated Stripe and "card data is
// never stored" (backend/src/modules/payment/payment.service.ts). Texts: payments.* in the language files.
const INFO = [
  { icon: "checkmark-circle", title: "payments.afterTitle", body: "payments.afterBody" },
  { icon: "flask", title: "payments.testTitle", body: "payments.testBody" },
  { icon: "card", title: "payments.noCardsTitle", body: "payments.noCardsBody" },
] as const satisfies readonly { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[];

export default function PaymentsScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("payments.title")} subtitle={t("payments.subtitle")} />
      <ScrollView contentContainerStyle={styles.wrap}>
        {INFO.map((i) => (
          <View key={i.title} style={styles.card}>
            <View style={styles.icon}><Ionicons name={i.icon} size={20} color={colors.ink} /></View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={type.h3}>{t(i.title)}</Text>
              <Text style={type.bodyMuted}>{t(i.body)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingVertical: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
});
