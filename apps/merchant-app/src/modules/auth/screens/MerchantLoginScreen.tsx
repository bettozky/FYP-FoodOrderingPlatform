import React, { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, type ScrollViewInstance } from "react-native";
import { useAuth } from "../AuthContext";
import { errorText } from "../../../shared/api/client";
import { colors, radius, spacing, type, font, ui } from "../../../shared/theme/theme";
import ForgotPasswordModal from "../../../shared/components/ForgotPasswordModal";
import ShopSignupWizard from "../../onboarding/screens/ShopSignupWizard";

// Sign in, or create a shop account with the 8-step sign-up (modules/onboarding).
export default function MerchantLoginScreen() {
  const { login } = useAuth();
  const scroll = useRef<ScrollViewInstance>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("ahseng@scootmeal.test");
  const [password, setPassword] = useState("merchant123");

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: "login" | "register") {
    setMode(next);
    setError("");
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  const field = (label: string, value: string, set: (v: string) => void, extra: object = {}, testID?: string) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={set} placeholderTextColor={colors.textFaint} accessibilityLabel={label} testID={testID} {...extra} />
    </>
  );

  return (
    <ScrollView ref={scroll} contentContainerStyle={[styles.wrap, mode === "register" && styles.wrapTop]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
      <Text style={type.h1}>ScootMeal Merchant</Text>
      <Text style={[type.bodyMuted, { marginBottom: spacing.lg }]}>
        {mode === "login" ? "Sign in to manage your store" : "Register your business. It goes live once an admin approves it."}
      </Text>

      <View style={styles.seg}>
        {(["login", "register"] as const).map((m) => (
          <Pressable key={m} style={[styles.segBtn, mode === m && styles.segOn]} onPress={() => changeMode(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} testID={`mode-${m}`}>
            <Text style={[styles.segText, mode === m && ui.segTextOn]}>{m === "login" ? "Sign in" : "Create shop account"}</Text>
          </Pressable>
        ))}
      </View>

      {mode === "login" ? (
        <>
          {field("Email", email, setEmail, { autoCapitalize: "none", keyboardType: "email-address", placeholder: "you@restaurant.com" }, "login-email")}
          {field("Password", password, setPassword, { secureTextEntry: true, placeholder: "Password", onSubmitEditing: signIn }, "login-password")}
          <Pressable onPress={() => setForgot(true)} style={styles.forgot} accessibilityRole="button" testID="forgot-password"><Text style={styles.forgotText}>Forgot password?</Text></Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={signIn} disabled={busy} accessibilityRole="button" testID="login-button">
            <Text style={styles.ctaText}>{busy ? "Signing in…" : "Sign in"}</Text>
          </Pressable>
          <Text style={styles.hint}>Demo restaurant: ahseng@scootmeal.test / merchant123</Text>
        </>
      ) : (
        <View style={{ marginTop: spacing.md }}>
          <ShopSignupWizard onCancel={() => changeMode("login")} scrollToTop={() => scroll.current?.scrollTo({ y: 0, animated: true })} />
        </View>
      )}
      <ForgotPasswordModal visible={forgot} onClose={() => setForgot(false)} defaultEmail={email} onDone={(e) => { setEmail(e); setPassword(""); setError("Password changed. Sign in with your new password."); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.xl, maxWidth: 520, width: "100%", alignSelf: "center" },
  wrapTop: { justifyContent: "flex-start", paddingTop: spacing.xxl * 1.5, paddingBottom: spacing.xxl * 4 }, // extra room so the last fields can scroll above the keyboard
  seg: { ...ui.segTrack, marginBottom: spacing.md },
  segBtn: { ...ui.segItem },
  segOn: { ...ui.segItemOn },
  segText: { ...ui.segText },
  label: { ...font.displayBold, fontSize: 14, color: colors.ink, marginBottom: 6, marginTop: spacing.lg },
  input: { ...ui.input },
  cta: { ...ui.buttonDark, minHeight: 52, marginTop: spacing.xl },
  ctaText: { ...ui.buttonDarkText, fontSize: 16 },
  forgot: { alignSelf: "flex-end", minHeight: 40, justifyContent: "center" },
  forgotText: { ...font.displayBold, fontSize: 14, color: colors.amberText },
  error: { color: colors.chiliText, ...font.display, fontSize: 14, marginTop: spacing.md },
  hint: { ...type.small, textAlign: "center", marginTop: spacing.md },
});
