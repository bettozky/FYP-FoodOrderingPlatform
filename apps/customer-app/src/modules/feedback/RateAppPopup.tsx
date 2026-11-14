import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../shared/api/client";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { colors, fonts, spacing } from "../../shared/theme/theme";
import { RatingWord, StarPicker } from "../reviews/Stars";
import { popupStyles } from "./ReviewOrderPopup";

// Week task 3, pop-up 2: "Rate the app", right after "Review your order".
// The server decides when to ask (after a completed order, not again for 14 days after "Not now",
// never again once rated or after "Don't ask again"). Low ratings ask what to fix; the admin sees them.
export default function RateAppPopup({ visible, orderId, onDone }: { visible: boolean; orderId?: string; onDone: () => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStars(0);
    setComment("");
    setError("");
    setThanks(false);
  }, [visible]);

  async function send() {
    setBusy(true);
    setError("");
    try {
      await api("POST", "/feedback/app-rating", { rating: stars, comment: comment.trim() || undefined, orderId });
      setThanks(true);
      setTimeout(onDone, 1400);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function later(never: boolean) {
    api("POST", "/feedback/app-rating/later", { never }).catch(() => {});
    onDone();
  }

  const happy = stars >= 4;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => later(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.card} testID="rate-app-popup">
          {thanks ? (
            <>
              <View style={[styles.icon, { backgroundColor: colors.amberTint }]}>
                <Ionicons name="heart" size={32} color={colors.chili} />
              </View>
              <Text style={styles.title}>Terima kasih!</Text>
              <Text style={styles.body}>{happy ? "We're glad you're enjoying ScootMeal." : "Thanks for telling us. We'll use it to make ScootMeal better."}</Text>
            </>
          ) : (
            <>
              <View style={[styles.icon, { backgroundColor: colors.turmeric }]}>
                <Ionicons name="bicycle" size={32} color={colors.ink} />
              </View>
              <Text style={styles.title}>Rate the app</Text>
              <Text style={styles.body}>How do you like ordering with ScootMeal so far?</Text>
              <View style={{ alignItems: "center", gap: 4 }}>
                <StarPicker value={stars} onChange={setStars} />
                {stars ? <RatingWord value={stars} /> : null}
              </View>
              {stars ? (
                <TextInput
                  style={styles.input}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={happy ? "What do you like most? (optional)" : "What should we fix? (optional)"}
                  placeholderTextColor={colors.textFaint}
                  maxLength={500}
                  multiline
                  accessibilityLabel="Comment about the app"
                />
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton label={stars ? "Send rating" : "Tap a star to rate"} onPress={send} loading={busy} disabled={!stars} style={{ alignSelf: "stretch" }} testID="send-app-rating" />
              <View style={styles.links}>
                <Pressable onPress={() => later(false)} hitSlop={8} accessibilityRole="button" testID="rate-later">
                  <Text style={styles.later}>Not now</Text>
                </Pressable>
                <Text style={styles.dot}>·</Text>
                <Pressable onPress={() => later(true)} hitSlop={8} accessibilityRole="button" testID="rate-never">
                  <Text style={[styles.later, { color: colors.stoneText }]}>Don't ask again</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ...popupStyles,
  links: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { fontFamily: fonts.display, color: colors.stoneText },
});
