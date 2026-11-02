import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, errorText } from "../../shared/api/client";
import EmptyState from "../../shared/components/EmptyState";
import { colors, spacing, type } from "../../shared/theme/theme";
import RatingSummary from "./RatingSummary";
import ReviewCard from "./ReviewCard";
import type { Breakdown, ReviewItem } from "./types";

const PAGE = 10;

/**
 * Public reviews for a shop (`/merchants/:id/reviews`) or one dish (`/dishes/:id/reviews`), with the star summary
 * and a "Show more" button. Shop reviews can be filtered to one dish with `dishId`.
 */
export default function ReviewsList({ merchantId, dishId, showDish = true }: { merchantId?: string; dishId?: string; showDish?: boolean }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<{ average: number | null; count: number; breakdown?: Breakdown } | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      if (merchantId) {
        const r = await api<{ average: number | null; count: number; breakdown: Breakdown; total: number; reviews: ReviewItem[] }>(
          "GET", `/merchants/${merchantId}/reviews?limit=${PAGE}&offset=${offset}${dishId ? `&dishId=${dishId}` : ""}`);
        setSummary({ average: r.average, count: r.count, breakdown: r.breakdown });
        setTotal(r.total);
        setItems((cur) => (offset === 0 ? r.reviews : [...cur, ...r.reviews]));
      } else if (dishId) {
        const r = await api<{ average: number | null; count: number; breakdown: Breakdown; reviews: ReviewItem[] }>("GET", `/dishes/${dishId}/reviews`);
        setSummary({ average: r.average, count: r.count, breakdown: r.breakdown });
        setTotal(r.reviews.length);
        setItems(r.reviews);
      }
      setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [merchantId, dishId]);

  useEffect(() => { setItems([]); setSummary(null); load(0); }, [load]);

  if (!summary && loading) return <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />;
  if (error && !summary) return <Text style={styles.error}>{error}</Text>;
  if (!summary || summary.count === 0) return <EmptyState icon="star-outline" title="No reviews yet" hint="Reviews appear after customers receive and rate their food." />;

  return (
    <View>
      <RatingSummary average={summary.average} count={summary.count} breakdown={summary.breakdown} />
      {items.map((r) => <ReviewCard key={r.id} review={showDish ? r : { ...r, dishName: undefined }} />)}
      {items.length < total ? (
        <Pressable style={styles.more} onPress={() => load(items.length)} disabled={loading} accessibilityRole="button" testID="more-reviews">
          {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={type.h3}>Show more reviews</Text>}
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  more: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontSize: 13, textAlign: "center", marginTop: spacing.md },
});
