import React, { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../AuthContext";
import { errorText } from "../../../shared/api/client";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";
import ShopSignupWizard from "../../onboarding/screens/ShopSignupWizard";

// Sign in, or create a shop account with the 8-step sign-up (modules/onboarding).
export default function MerchantLoginScreen() {
  const { login } = useAuth();
  const scroll = useRef<ScrollView>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
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
    <ScrollView ref={scroll} contentContainerStyle={[styles.wrap, mode === "register" && styles.wrapTop]} keyboardShouldPersistTaps="handled">
      <Text style={type.h1}>ScootMeal Merchant</Text>
      <Text style={[type.bodyMuted, { marginBottom: spacing.lg }]}>
        {mode === "login" ? "Sign in to manage your store" : "Register your business. It goes live once an admin approves it."}
      </Text>

      <View style={styles.seg}>
        {(["login", "register"] as const).map((m) => (
          <Pressable key={m} style={[styles.segBtn, mode === m && styles.segOn]} onPress={() => changeMode(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} testID={`mode-${m}`}>
            <Text style={[styles.segText, mode === m && { color: colors.white }]}>{m === "login" ? "Sign in" : "Create shop account"}</Text>
          </Pressable>
        ))}
      </View>

      {mode === "login" ? (
        <>
          {field("Email", email, setEmail, { autoCapitalize: "none", keyboardType: "email-address", placeholder: "you@restaurant.com" }, "login-email")}
          {field("Password", password, setPassword, { secureTextEntry: true, placeholder: "Password", onSubmitEditing: signIn }, "login-password")}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.xl, maxWidth: 520, width: "100%", alignSelf: "center" },
  wrapTop: { justifyContent: "flex-start", paddingTop: spacing.xxl * 1.5, paddingBottom: spacing.xxl * 2 },
  seg: { flexDirection: "row", backgroundColor: colors.paperDim, borderRadius: radius.pill, padding: 3, marginBottom: spacing.sm },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  label: { ...type.small, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontFamily: fonts.serifMedium, color: colors.text },
  cta: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: "center", marginTop: spacing.xl },
  ctaText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 15 },
  error: { color: colors.chiliText, fontFamily: fonts.display, marginTop: spacing.md },
  hint: { ...type.small, textAlign: "center", marginTop: spacing.md },
});
