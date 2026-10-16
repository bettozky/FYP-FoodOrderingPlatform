import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../AuthContext";
import { errorText } from "../../../shared/api/client";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";

// Sign in, or register a new business (FR-5.1: short onboarding, active once an admin approves it).
export default function MerchantLoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("ahseng@scootmeal.test");
  const [password, setPassword] = useState("merchant123");

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [stallNo, setStallNo] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [open, setOpen] = useState("09:00");
  const [close, setClose] = useState("21:00");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, value: string, set: (v: string) => void, extra: object = {}, testID?: string) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={set} placeholderTextColor={colors.textFaint} testID={testID} {...extra} />
    </>
  );

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={type.h1}>ScootMeal Merchant</Text>
      <Text style={[type.bodyMuted, { marginBottom: spacing.lg }]}>
        {mode === "login" ? "Sign in to manage your store" : "Register your business. It goes live once an admin approves it."}
      </Text>

      <View style={styles.seg}>
        {(["login", "register"] as const).map((m) => (
          <Pressable key={m} style={[styles.segBtn, mode === m && styles.segOn]} onPress={() => { setMode(m); setError(""); }} testID={`mode-${m}`}>
            <Text style={[styles.segText, mode === m && { color: colors.white }]}>{m === "login" ? "Sign in" : "Register business"}</Text>
          </Pressable>
        ))}
      </View>

      {mode === "login" ? (
        <>
          {field("Email", email, setEmail, { autoCapitalize: "none", keyboardType: "email-address", placeholder: "you@restaurant.com" }, "login-email")}
          {field("Password", password, setPassword, { secureTextEntry: true, placeholder: "Password", onSubmitEditing: () => run(() => login(email.trim(), password)) }, "login-password")}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={() => run(() => login(email.trim(), password))} disabled={busy} testID="login-button">
            <Text style={styles.ctaText}>{busy ? "Signing in…" : "Sign in"}</Text>
          </Pressable>
          <Text style={styles.hint}>Demo restaurant: ahseng@scootmeal.test / merchant123</Text>
        </>
      ) : (
        <>
          {field("Business name", businessName, setBusinessName, { placeholder: "e.g. Kopitiam Lama" }, "reg-business")}
          {field("Owner name", ownerName, setOwnerName, {}, "reg-owner")}
          {field("Email", email === "ahseng@scootmeal.test" ? "" : email, setEmail, { autoCapitalize: "none", keyboardType: "email-address" }, "reg-email")}
          {field("Phone (customers may call this)", phone, setPhone, { keyboardType: "phone-pad", placeholder: "+60 12-345 6789" }, "reg-phone")}
          {field("Stall / address", stallNo, setStallNo, { placeholder: "Canteen B, Stall 6" })}
          {field("Cuisine", cuisine, setCuisine, { placeholder: "Noodles, Malay, Drinks…" })}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>{field("Opens", open, setOpen, { placeholder: "09:00" })}</View>
            <View style={{ flex: 1 }}>{field("Closes", close, setClose, { placeholder: "21:00" })}</View>
          </View>
          {field("Password (6+ characters)", password === "merchant123" ? "" : password, setPassword, { secureTextEntry: true }, "reg-password")}
          {error ? <Text style={styles.error} testID="reg-error">{error}</Text> : null}
          <Pressable
            style={[styles.cta, busy && { opacity: 0.6 }]}
            onPress={() => run(() => register({ businessName, ownerName, email: email.trim(), phone, password, stallNo, cuisine, open, close }))}
            disabled={busy}
            testID="reg-button"
          >
            <Text style={styles.ctaText}>{busy ? "Submitting…" : "Submit for approval"}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.xl, maxWidth: 520, width: "100%", alignSelf: "center" },
  seg: { flexDirection: "row", backgroundColor: colors.paperDim, borderRadius: radius.pill, padding: 3, marginBottom: spacing.sm },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  label: { ...type.small, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontFamily: fonts.serifMedium, color: colors.text },
  cta: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: "center", marginTop: spacing.xl },
  ctaText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 15 },
  error: { color: colors.chili, fontFamily: fonts.display, marginTop: spacing.md },
  hint: { ...type.small, textAlign: "center", marginTop: spacing.md },
});
