import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../shared/api/client";
import { Voucher } from "../../../shared/api/types";
import { colors, fonts, radius, spacing } from "../../../shared/theme/theme";

// Highlights the best voucher that any order can use (inspired by the wireframes' promo card).
// The text comes straight from the voucher, so it is always what Checkout will offer. It shows
// nothing if there is no general voucher or the request fails.
export default function PromoBanner() {
  const [voucher, setVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    api<{ vouchers: Voucher[] }>("GET", "/vouchers")
      .then((r) => {
        const general = r.vouchers.filter((v) => !v.merchantId && !v.requireCategory);
        setVoucher(general.sort((a, b) => b.amount - a.amount)[0] ?? null);
      })
      .catch(() => {});
  }, []);

  if (!voucher) return null;
  return (
    <View style={styles.card} accessible accessibilityLabel={`Voucher: ${voucher.title}. ${voucher.description}. Choose it at checkout.`}>
      <View style={styles.text}>
        <View style={styles.tag}>
          <Ionicons name="pricetag" size={11} color={colors.ink} />
          <Text style={styles.tagText}>VOUCHER</Text>
        </View>
        <Text style={styles.title}>{voucher.title}</Text>
        <Text style={styles.sub}>{voucher.description} · choose it at checkout</Text>
      </View>
      <Text style={styles.emoji}>🎟️</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.ink, borderRadius: radius.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg },
  text: { flex: 1, minWidth: 0, gap: 4 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: colors.turmeric, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  tagText: { fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink, letterSpacing: 0.4 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 20, color: colors.white },
  sub: { fontFamily: fonts.serifMedium, fontSize: 12, color: "#D6D1C4" },
  emoji: { fontSize: 34 },
});
