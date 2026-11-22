import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { errorText } from "../../shared/api/client";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { colors, radius, spacing, type } from "../../shared/theme/theme";
import { RatingWord, StarPicker } from "./Stars";
import { useTranslation } from "react-i18next";

/** Pop-up to write or edit a review. onSubmit may throw; the message is shown inside the pop-up. */
export default function ReviewEditor({
  visible, title, subtitle, initial, submitLabel, onSubmit, onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  initial?: { rating: number; comment?: string };
  submitLabel?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setStars(initial?.rating ?? 5);
    setComment(initial?.comment ?? "");
    setError("");
  }, [visible, initial?.rating, initial?.comment]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await onSubmit(stars, comment.trim());
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={type.h2}>{title}</Text>
          {subtitle ? <Text style={type.bodyMuted}>{subtitle}</Text> : null}
          <View style={{ marginVertical: spacing.sm, gap: 4 }}>
            <StarPicker value={stars} onChange={setStars} />
            <RatingWord value={stars} />
          </View>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder={t("myReviews.placeholder")}
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={300}
            testID="review-comment"
          />
          <Text style={[type.small, { textAlign: "right" }]}>{comment.length}/300</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={submitLabel ?? t("track.submitReview")} onPress={submit} loading={busy} testID="review-submit" />
          <PrimaryButton label={t("common.cancel")} variant="outline" onPress={onClose} disabled={busy} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  input: { minHeight: 90, textAlignVertical: "top", borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine, padding: spacing.md, color: colors.ink },
  error: { color: colors.danger, fontSize: 13 },
});
