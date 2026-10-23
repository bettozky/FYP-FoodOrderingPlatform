import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../AuthContext";
import { errorText } from "../../../shared/api/client";
import { colors, radius, spacing, type, fonts } from "../../../shared/theme/theme";

const signupSteps = [
  { title: "Your shop", description: "What should customers see as your shop name?" },
  { title: "Shop owner", description: "Who will manage this merchant account?" },
  { title: "Email address", description: "Use an email address you can access." },
  { title: "Phone number", description: "Customers may use this number to contact your shop." },
  { title: "Shop location", description: "Add a stall number, venue, or street address." },
  { title: "Food category", description: "Tell customers what kind of food you serve." },
  { title: "Opening hours", description: "Set your usual daily opening and closing times." },
  { title: "Secure your account", description: "Choose a password, then review your application." },
];

export default function MerchantLoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("ahseng@scootmeal.test");
  const [password, setPassword] = useState("merchant123");
  const [passwordConfirm, setPasswordConfirm] = useState("");

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

  function validateStep() {
    if (step === 0 && !businessName.trim()) return "Enter your shop name to continue.";
    if (step === 1 && !ownerName.trim()) return "Enter the shop owner's name to continue.";
    if (step === 2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address to continue.";
    if (step === 3 && !phone.trim()) return "Enter a phone number to continue.";
    if (step === 4 && !stallNo.trim()) return "Enter your shop location to continue.";
    if (step === 5 && !cuisine.trim()) return "Enter a food category to continue.";
    if (step === 6 && !/^([01]\d|2[0-3]):[0-5]\d$/.test(open)) return "Opening time must use 24-hour format, such as 09:00.";
    if (step === 6 && !/^([01]\d|2[0-3]):[0-5]\d$/.test(close)) return "Closing time must use 24-hour format, such as 21:00.";
    if (step === 7 && password.length < 6) return "Choose a password with at least 6 characters.";
    if (step === 7 && password !== passwordConfirm) return "Your passwords do not match.";
    return "";
  }

  function continueSignup() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, signupSteps.length - 1));
  }

  function changeMode(nextMode: "login" | "register") {
    if (nextMode === "register") {
      if (email === "ahseng@scootmeal.test") setEmail("");
      if (password === "merchant123") setPassword("");
    }
    setMode(nextMode);
    setStep(0);
    setError("");
  }

  function renderSignupStep() {
    switch (step) {
      case 0:
        return field("Shop name", businessName, setBusinessName, { placeholder: "e.g. Kopitiam Lama", autoCapitalize: "words", returnKeyType: "done" }, "reg-business");
      case 1:
        return field("Owner's full name", ownerName, setOwnerName, { placeholder: "Name on your account", autoCapitalize: "words", returnKeyType: "done" }, "reg-owner");
      case 2:
        return field("Email address", email, setEmail, { autoCapitalize: "none", keyboardType: "email-address", autoComplete: "email", placeholder: "you@restaurant.com" }, "reg-email");
      case 3:
        return field("Phone number", phone, setPhone, { keyboardType: "phone-pad", autoComplete: "tel", placeholder: "+60 12-345 6789" }, "reg-phone");
      case 4:
        return field("Stall or address", stallNo, setStallNo, { placeholder: "Canteen B, Stall 6", autoCapitalize: "words" }, "reg-location");
      case 5:
        return field("Cuisine or food category", cuisine, setCuisine, { placeholder: "Noodles, Malay, Drinks…", autoCapitalize: "words" }, "reg-cuisine");
      case 6:
        return (
          <View style={styles.hoursRow}>
            <View style={styles.hoursField}>{field("Opens", open, setOpen, { placeholder: "09:00", keyboardType: "numbers-and-punctuation" }, "reg-open")}</View>
            <View style={styles.hoursField}>{field("Closes", close, setClose, { placeholder: "21:00", keyboardType: "numbers-and-punctuation" }, "reg-close")}</View>
          </View>
        );
      default:
        return (
          <>
            {field("Password (6+ characters)", password, setPassword, { secureTextEntry: true, autoComplete: "new-password", placeholder: "Create a password" }, "reg-password")}
            {field("Confirm password", passwordConfirm, setPasswordConfirm, { secureTextEntry: true, autoComplete: "new-password", placeholder: "Enter it again" }, "reg-password-confirm")}
          </>
        );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={type.h1}>ScootMeal Merchant</Text>
      <Text style={[type.bodyMuted, { marginBottom: spacing.lg }]}>
        {mode === "login" ? "Sign in to manage your store" : "Register your business. It goes live once an admin approves it."}
      </Text>

      <View style={styles.seg}>
        {(["login", "register"] as const).map((m) => (
          <Pressable key={m} style={[styles.segBtn, mode === m && styles.segOn]} onPress={() => changeMode(m)} testID={`mode-${m}`}>
            <Text style={[styles.segText, mode === m && { color: colors.white }]}>{m === "login" ? "Sign in" : "Create shop account"}</Text>
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
          <View style={styles.stepHeading}>
            <View style={styles.stepTopline}>
              <Text style={styles.stepCount}>STEP {step + 1} OF {signupSteps.length}</Text>
              <Text style={styles.stepCount}>{Math.round(((step + 1) / signupSteps.length) * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((step + 1) / signupSteps.length) * 100}%` }]} />
            </View>
            <Text style={type.h2}>{signupSteps[step].title}</Text>
            <Text style={type.bodyMuted}>{signupSteps[step].description}</Text>
          </View>
          {step < 7 ? renderSignupStep() : (
            <>
              {renderSignupStep()}
              <View style={styles.review} testID="reg-review">
                <Text style={styles.reviewTitle}>Application summary</Text>
                <Text style={styles.reviewLine}>{businessName.trim()}</Text>
                <Text style={styles.reviewLine}>{ownerName.trim()} · {email.trim()}</Text>
                <Text style={styles.reviewLine}>{phone.trim()} · {stallNo.trim()}</Text>
                <Text style={styles.reviewLine}>{cuisine.trim()} · {open}–{close}</Text>
                <Text style={styles.reviewNote}>Your shop will be reviewed by the ScootMeal team before it goes live.</Text>
              </View>
            </>
          )}
          {error ? <Text style={styles.error} testID="reg-error">{error}</Text> : null}
          <View style={styles.stepActions}>
            {step > 0 ? (
              <Pressable style={styles.backButton} onPress={() => { setError(""); setStep((current) => current - 1); }} disabled={busy} testID="reg-back">
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.cta, styles.stepCta, busy && { opacity: 0.6 }]}
              onPress={() => step === 7
                ? run(() => register({ businessName: businessName.trim(), ownerName: ownerName.trim(), email: email.trim(), phone: phone.trim(), password, stallNo: stallNo.trim(), cuisine: cuisine.trim(), open, close }))
                : continueSignup()}
              disabled={busy}
              testID={step === 7 ? "reg-button" : "reg-next"}
            >
              <Text style={styles.ctaText}>{busy ? "Submitting…" : step === 7 ? "Submit for approval" : "Continue"}</Text>
            </Pressable>
          </View>
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
  stepHeading: { gap: spacing.sm, marginBottom: spacing.md },
  stepTopline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepCount: { ...type.small, fontFamily: fonts.displayBold, color: colors.herb },
  progressTrack: { height: 5, backgroundColor: colors.paperDim, borderRadius: radius.pill, overflow: "hidden", marginBottom: spacing.sm },
  progressFill: { height: "100%", backgroundColor: colors.turmeric, borderRadius: radius.pill },
  hoursRow: { flexDirection: "row", gap: spacing.md },
  hoursField: { flex: 1 },
  stepActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  backButton: { minWidth: 76, paddingVertical: spacing.md + 2, alignItems: "center", marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill },
  backText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
  stepCta: { flex: 1 },
  review: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.paperDim, borderRadius: radius.md, gap: spacing.xs },
  reviewTitle: { ...type.h3, marginBottom: spacing.xs },
  reviewLine: { ...type.small, color: colors.ink },
  reviewNote: { ...type.small, marginTop: spacing.sm },
});
