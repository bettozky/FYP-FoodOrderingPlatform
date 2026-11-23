import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, errorText } from "../api/client";
import { colors, fonts, radius, spacing, type } from "../theme/theme";
import { useTranslation } from "react-i18next";
import { passwordOk } from "../util/password";

// Forgot password, in two steps: (1) type your email and we send a 6-digit code, (2) type the code and a new password.
export default function ForgotPasswordModal({ visible, onClose, defaultEmail = "", onDone }: { visible: boolean; onClose: () => void; defaultEmail?: string; onDone?: (email: string) => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (visible) { setStep(1); setEmail(defaultEmail); setCode(""); setPassword(""); setError(""); setInfo(""); }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  const send = () => run(async () => {
    const r = await api<{ message: string; devCode?: string }>("POST", "/auth/forgot", { email: email.trim() });
    setInfo(r.message);
    if (r.devCode) setCode(r.devCode); // only when the server is in test mode
    setStep(2);
  });

  const reset = () => run(async () => {
    if (!passwordOk(password)) throw new Error(t("auth.passwordRule"));
    await api("POST", "/auth/reset", { email: email.trim(), code: code.trim(), newPassword: password });
    onDone?.(email.trim());
    onClose();
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={type.h2}>{step === 1 ? t("forgot.title") : t("forgot.newTitle")}</Text>
          {step === 1 ? (
            <>
              <Text style={type.bodyMuted}>{t("forgot.intro")}</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textFaint} autoCapitalize="none" keyboardType="email-address" testID="forgot-email" />
            </>
          ) : (
            <>
              <Text style={type.bodyMuted}>{info}</Text>
              <TextInput style={styles.input} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} placeholder={t("forgot.code")} placeholderTextColor={colors.textFaint} keyboardType="number-pad" maxLength={6} testID="forgot-code" />
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={t("forgot.newPassword")} placeholderTextColor={colors.textFaint} secureTextEntry autoCapitalize="none" testID="forgot-password" />
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={step === 1 ? send : reset} disabled={busy} accessibilityRole="button" testID="forgot-submit">
            {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.ctaText}>{step === 1 ? t("forgot.send") : t("forgot.change")}</Text>}
          </Pressable>
          {step === 2 ? <Pressable onPress={send} disabled={busy} hitSlop={8}><Text style={styles.link}>{t("forgot.resend")}</Text></Pressable> : null}
          <Pressable onPress={onClose} hitSlop={8}><Text style={styles.link}>{t("common.cancel")}</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, maxWidth: 480, width: "100%", alignSelf: "center" },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine, paddingHorizontal: spacing.md, color: colors.ink, backgroundColor: colors.bg },
  error: { color: colors.danger, fontSize: 13 },
  cta: { minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center", marginTop: spacing.xs },
  ctaText: { fontFamily: fonts.displayBold, color: colors.ink, fontSize: 15 },
  link: { textAlign: "center", color: colors.stoneText, fontSize: 13.5, paddingVertical: 4 },
});
