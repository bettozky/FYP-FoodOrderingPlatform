import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../shared/api/client";
import type { Dish, Order } from "../../shared/api/types";
import DishImage from "../../shared/components/DishImage";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { colors, fonts, radius, spacing, type } from "../../shared/theme/theme";
import { RatingWord, StarPicker } from "../reviews/Stars";

// Week task 3, pop-up 1: "Review your order", shown once an order is completed.
// One row per dish the customer received: tap the stars, optionally add a comment, then send.
// Each rated dish becomes a normal review (POST /orders/:id/reviews), the same as from "My reviews".
type Row = { dishId: string; name: string; rating: number; comment: string; open: boolean };

export default function ReviewOrderPopup({ order, onDone }: { order: Order | null; onDone: (reviewed: boolean) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  // Dishes still to review: received (collected / delivered) and not reviewed yet, one row per dish.
  const dishes = useMemo(() => {
    if (!order) return [];
    const seen = new Set<string>();
    return order.items.filter((i) => {
      if (!["collected", "delivered"].includes(i.status) || order.reviewedDishIds.includes(i.dishId) || seen.has(i.dishId)) return false;
      seen.add(i.dishId);
      return true;
    });
  }, [order]);

  useEffect(() => {
    if (!order) return;
    setRows(dishes.map((d) => ({ dishId: d.dishId, name: d.name, rating: 0, comment: "", open: false })));
    setError("");
    setThanks(false);
    api<{ dishes: Dish[] }>("GET", `/dishes?merchantId=${encodeURIComponent(order.merchantId)}`)
      .then((r) => setImages(Object.fromEntries(r.dishes.map((d) => [d.id, d.image]))))
      .catch(() => {});
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (i: number, patch: Partial<Row>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const rated = rows.filter((r) => r.rating > 0);

  async function send() {
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      for (const r of rated) await api("POST", `/orders/${order.id}/reviews`, { dishId: r.dishId, rating: r.rating, comment: r.comment.trim() || undefined });
      setThanks(true);
      setTimeout(() => onDone(true), 1200);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={!!order} transparent animationType="fade" onRequestClose={() => onDone(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.card} testID="review-order-popup">
          {thanks ? (
            <View style={styles.thanks}>
              <View style={[styles.icon, { backgroundColor: colors.herbLight }]}>
                <Ionicons name="checkmark-circle" size={34} color={colors.herb} />
              </View>
              <Text style={styles.title}>Thanks for your review!</Text>
              <Text style={styles.body}>It helps other students choose, and tells {order?.merchantName} what you liked.</Text>
            </View>
          ) : (
            <>
              <View style={[styles.icon, { backgroundColor: colors.amberTint }]}>
                <Ionicons name="star" size={30} color={colors.turmeric} />
              </View>
              <Text style={styles.title}>Review your order</Text>
              <Text style={styles.body}>How was your food from {order?.merchantName}? Tap the stars for each dish.</Text>

              <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
                {rows.map((r, i) => (
                  <View key={r.dishId} style={styles.row}>
                    <View style={styles.rowTop}>
                      <DishImage image={images[r.dishId]} size={44} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.dish} numberOfLines={2}>{r.name}</Text>
                        {r.rating ? <RatingWord value={r.rating} /> : <Text style={type.small}>Not rated yet</Text>}
                      </View>
                    </View>
                    <StarPicker value={r.rating} onChange={(n) => set(i, { rating: n })} size={28} />
                    {r.open ? (
                      <TextInput
                        style={styles.input}
                        value={r.comment}
                        onChangeText={(t) => set(i, { comment: t })}
                        placeholder="What did you think? (optional)"
                        placeholderTextColor={colors.textFaint}
                        maxLength={300}
                        multiline
                        accessibilityLabel={`Comment for ${r.name}`}
                      />
                    ) : r.rating ? (
                      <Pressable onPress={() => set(i, { open: true })} hitSlop={8} accessibilityRole="button">
                        <Text style={styles.link}>+ Add a comment</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </ScrollView>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                label={rated.length ? `Send ${rated.length === 1 ? "review" : `${rated.length} reviews`}` : "Tap the stars to rate"}
                onPress={send}
                loading={busy}
                disabled={!rated.length}
                style={{ alignSelf: "stretch" }}
                testID="send-review"
              />
              <Pressable onPress={() => onDone(false)} hitSlop={8} accessibilityRole="button" testID="review-later">
                <Text style={styles.later}>Maybe later</Text>
              </Pressable>
              <Text style={styles.hint}>You can also review it later in Account → My reviews.</Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const popupStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 400, maxHeight: "90%", backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, alignItems: "center", gap: spacing.md },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  title: { ...type.h2, textAlign: "center" },
  body: { ...type.body, textAlign: "center", color: colors.stoneText },
  later: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink, textDecorationLine: "underline" },
  hint: { fontFamily: fonts.serif, fontSize: 12, color: colors.stoneText, textAlign: "center" },
  error: { fontFamily: fonts.display, color: colors.chiliText, textAlign: "center" },
  input: { alignSelf: "stretch", minHeight: 64, borderWidth: 1, borderColor: colors.stoneLine, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.serif, fontSize: 14, color: colors.ink, textAlignVertical: "top" },
});

const styles = StyleSheet.create({
  ...popupStyles,
  thanks: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  list: { alignSelf: "stretch", maxHeight: 340 },
  row: { borderWidth: 1, borderColor: colors.stoneLine, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, alignItems: "center" },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md, alignSelf: "stretch" },
  dish: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
  link: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.amberText },
});
