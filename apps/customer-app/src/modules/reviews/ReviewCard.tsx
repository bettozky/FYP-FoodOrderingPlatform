import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type, ui } from "../../shared/theme/theme";
import { StarRow } from "./Stars";
import type { ReviewItem } from "./types";
import { useTranslation } from "react-i18next";
import { locale } from "../../shared/i18n";

export const reviewDate = (ts: number) => new Date(ts).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });

/** One review, with the shop's reply underneath when there is one. `footer` is for buttons (edit / delete). */
export default function ReviewCard({ review, showShop, footer }: { review: ReviewItem; showShop?: boolean; footer?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card} testID={`review-${review.id}`}>
      <View style={styles.top}>
        <Text style={[type.h3, { flex: 1 }]} numberOfLines={1}>{showShop ? review.merchantName ?? review.userName : review.userName}</Text>
        <StarRow rating={review.rating} />
      </View>
      <Text style={type.small}>
        {review.dishName ? `${review.dishName} · ` : ""}{reviewDate(review.createdAt)}{review.editedAt ? ` · ${t("reviews.edited")}` : ""}
      </Text>
      {review.hidden ? <Text style={styles.hidden}>{t("reviews.hidden")}</Text> : null}
      {review.comment ? <Text style={[type.bodyMuted, { marginTop: 2 }]}>{review.comment}</Text> : null}
      {review.reply ? (
        <View style={styles.reply}>
          <Text style={styles.replyHead}>{t("reviews.reply")}</Text>
          <Text style={type.bodyMuted}>{review.reply.text}</Text>
        </View>
      ) : null}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, padding: spacing.md, marginBottom: spacing.sm, gap: 2 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  reply: { marginTop: spacing.sm, backgroundColor: colors.paperDim, borderRadius: radius.sm, padding: spacing.sm, gap: 2 },
  replyHead: { fontSize: 12, color: colors.ink, fontWeight: "700" },
  hidden: { fontSize: 12, color: colors.chiliText ?? colors.danger },
});
