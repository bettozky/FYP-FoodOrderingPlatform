// FR-5.1 shop sign-up: 8 steps from the task plan (section 7), matching Figma frames M02–M09.
// Shown inside MerchantLoginScreen when "Create shop account" is chosen. Submitting creates a PENDING
// shop; the merchant then sees PendingApprovalScreen until an admin approves it in the web admin.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { errorText } from "../../../shared/api/client";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { STEP_COMPONENTS } from "../signup/steps";
import { emptyApplication, ShopApplication, STEPS, toSignupRequest } from "../signup/types";
import { Errors, firstIncompleteStep, validateStep } from "../signup/validate";
import { canPickFiles } from "../signup/pickFile";
import { uploadSignupFiles } from "../signup/upload";

const LAST = STEPS.length - 1;

export default function ShopSignupWizard({ onCancel, scrollToTop }: { onCancel: () => void; scrollToTop?: () => void }) {
  const { register } = useAuth();
  const [a, setA] = useState<ShopApplication>(emptyApplication);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (patch: Partial<ShopApplication>) => {
    setA((cur) => ({ ...cur, ...patch }));
    // Clear a field's message as soon as the merchant edits it.
    if (Object.keys(errors).length) setErrors((cur) => { const next = { ...cur }; for (const k of Object.keys(patch)) delete next[k]; return next; });
  };

  const go = (next: number) => {
    setErrors({});
    setSubmitError("");
    setStep(next);
    scrollToTop?.();
  };

  function next() {
    const e = validateStep(step, a, canPickFiles);
    if (Object.keys(e).length) return setErrors(e);
    go(Math.min(step + 1, LAST));
  }

  async function submit() {
    const e = validateStep(LAST, a, canPickFiles);
    if (Object.keys(e).length) return setErrors(e);
    const bad = firstIncompleteStep(a, canPickFiles);
    if (bad >= 0) { go(bad); setErrors(validateStep(bad, a, canPickFiles)); return; }
    setBusy(true);
    setSubmitError("");
    try {
      // Files go up with the new account's token before the app switches to the "waiting for approval" screen.
      await register(toSignupRequest(a, !canPickFiles), () => uploadSignupFiles(a));
    } catch (err) {
      setSubmitError(errorText(err));
      setBusy(false);
    }
  }

  const Step = STEP_COMPONENTS[step];
  const errorCount = Object.keys(errors).length;
  return (
    <View style={styles.wrap} testID="shop-signup">
      <View style={styles.heading}>
        <View style={styles.topline}>
          <Text style={styles.count}>STEP {step + 1} OF {STEPS.length}</Text>
          <Text style={styles.count}>{STEPS[step].title.toUpperCase()}</Text>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: STEPS.length, now: step + 1 }}>
          <View style={[styles.fill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
        <Text style={type.h2} accessibilityRole="header">{STEPS[step].title}</Text>
        <Text style={type.bodyMuted}>{STEPS[step].description}</Text>
      </View>

      <View style={styles.fields}>
        <Step a={a} set={set} errors={errors} goTo={go} />
      </View>

      {errorCount > 1 ? <Text style={styles.summary}>Please fix the {errorCount} highlighted fields.</Text> : null}
      {submitError ? <Text style={styles.summary} testID="reg-error">{submitError}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.back} onPress={() => (step === 0 ? onCancel() : go(step - 1))} disabled={busy} accessibilityRole="button" testID="reg-back">
          <Text style={styles.backText}>{step === 0 ? "Cancel" : "Back"}</Text>
        </Pressable>
        <Pressable
          style={[styles.cta, busy && { opacity: 0.6 }]}
          onPress={step === LAST ? submit : next}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ busy }}
          testID={step === LAST ? "reg-button" : "reg-next"}
        >
          <Text style={styles.ctaText}>{busy ? "Submitting…" : step === LAST ? "Submit for approval" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  heading: { gap: spacing.sm },
  topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  count: { ...type.small, fontFamily: fonts.displayBold, color: colors.herb },
  track: { height: 5, backgroundColor: colors.paperDim, borderRadius: radius.pill, overflow: "hidden", marginBottom: spacing.xs },
  fill: { height: "100%", backgroundColor: colors.ink, borderRadius: radius.pill },
  fields: { gap: spacing.lg },
  summary: { ...type.small, color: colors.chiliText },
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  back: { minWidth: 88, minHeight: 48, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius.md },
  backText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
  cta: { flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md },
  ctaText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 15 },
});
