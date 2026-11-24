import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rm, mmss, useCountdown } from "../../../shared/util/format";
import { colors, radius, shadow, spacing, font } from "../../../shared/theme/theme";
import { usePayableOrders } from "../payments";
import { useTranslation } from "react-i18next";

// Stays on Home and Orders while an order is confirmed but unpaid, even after the top banner was swiped away.
export default function PayBar({ onPress, bottom }: { onPress: (orderId: string) => void; bottom: number }) {
  const { t } = useTranslation();
  const order = usePayableOrders()[0];
  const s = useCountdown(order?.payBy);
  if (!order) return null;
  return (
    <Pressable
      style={[styles.bar, { bottom }]}
      onPress={() => onPress(order.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t("paybar.payTo", { amount: rm(order.total), name: order.merchantName })}, ${t("paybar.left", { time: mmss(s) })}`}
      testID="pay-bar"
    >
      <View style={styles.icon}><Ionicons name="wallet" size={18} color={colors.ink} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{t("paybar.payTo", { amount: rm(order.total), name: order.merchantName })}</Text>
        <Text style={[styles.sub, s < 60 && { color: colors.chiliSoft }]}>{t("paybar.beforeCancel", { time: mmss(s) })}</Text>
      </View>
      <View style={styles.cta}><Text style={styles.ctaText}>{t("popups.payNow")}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 10, paddingLeft: 10, paddingRight: 10, ...shadow.sheet },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
  title: { ...font.displayBold, fontSize: 14, color: colors.white },
  sub: { ...font.serif, fontSize: 12, color: colors.stoneSoft },
  cta: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
  ctaText: { ...font.displayExtraBold, fontSize: 13, color: colors.ink },
});
