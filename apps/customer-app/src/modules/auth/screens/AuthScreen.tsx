import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  Pressable,
  Image,
  Animated,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../AuthContext";
import { errorText } from "../../../shared/api/client";
import GoogleSignInButton, { googleSignInAvailable } from "../components/GoogleSignInButton";
import ForgotPasswordModal from "../../../shared/components/ForgotPasswordModal";
import PhoneInput, { fullPhone, phoneLooksValid } from "../../../shared/components/PhoneInput";
import { passwordChecks, passwordOk } from "../../../shared/util/password";
import GuardianModal, { type Guardian } from "../components/GuardianModal";
import { colors, spacing, type, radius, shadow, font } from "../../../shared/theme/theme";
import { useTranslation } from "react-i18next";
import LanguagePicker from "../../../shared/i18n/LanguagePicker";

const TABS = ["auth.signIn", "auth.signUp"] as const;

/** "or" line above the Google button; shown only when Google sign-in is set up for this build. */
function GoogleOr() {
  const { t } = useTranslation();
  if (!googleSignInAvailable) return null;
  return (
    <View style={styles.orRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{t("auth.or")}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}
// What makes ScootMeal different, shown before anyone has logged in (login stays required, FR-1.1).
const PROMISES = [
  { icon: "shield-checkmark-outline", text: "auth.promiseCharge" },
  { icon: "restaurant-outline", text: "auth.promiseModes" },
  { icon: "calendar-outline", text: "auth.promiseBook" },
] as const;
// FR-1.2 age rule (the numbers are assumptions to confirm with the client; the server enforces the same rule):
// under MIN_AGE nobody can sign up; under GUARDIAN_AGE a parent or guardian must approve the account.
const MIN_AGE = 13;
const GUARDIAN_AGE = 16;

function ageFrom(y: number, m: number, d: number) {
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

export default function AuthScreen() {
  const { login, loginWithGoogle, register } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 520); // matches the centered card on wide/web viewports

  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // sign in (demo account pre-filled for the prototype)
  const [email, setEmail] = useState("demo@scootmeal.test");
  const [password, setPassword] = useState("demo123");
  const [showPassword, setShowPassword] = useState(false);
  const [forgot, setForgot] = useState(false);

  // sign up
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+60");
  const [phone, setPhone] = useState("");
  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Under GUARDIAN_AGE: the sign-up (or Google sign-up) waits here until a parent or guardian approves in the pop-up.
  const [guardianFor, setGuardianFor] = useState<
    | { kind: "register"; age: number; input: { name: string; email: string; phone: string; dob: string; password: string } }
    | { kind: "google"; age: number; idToken: string; dob: string }
    | null
  >(null);
  const [guardianError, setGuardianError] = useState("");

  // Google: a brand-new person must give their date of birth (age rule) before the account is created.
  const [googleNew, setGoogleNew] = useState<{ idToken: string; name: string; email: string } | null>(null);
  const [gdd, setGdd] = useState("");
  const [gmm, setGmm] = useState("");
  const [gyyyy, setGyyyy] = useState("");
  const [googleError, setGoogleError] = useState("");

  function goToTab(i: number) {
    setActiveTab(i);
    setError("");
    scrollRef.current?.scrollTo({ x: i * pageWidth, animated: true });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== activeTab) setActiveTab(i);
  }

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

  const doLogin = () => run(() => login(email.trim(), password));

  const onGoogleToken = (idToken: string) =>
    run(async () => {
      const r = await loginWithGoogle(idToken);
      if (r) { setGoogleError(""); setGoogleNew({ idToken, name: r.name, email: r.email }); }
    });
  const finishGoogle = async () => {
    if (!googleNew) return;
    const y = Number(gyyyy), m = Number(gmm), d = Number(gdd);
    if (!Number.isInteger(y) || y < 1900 || m < 1 || m > 12 || d < 1 || d > 31 || gyyyy.length !== 4) return setGoogleError(t("auth.dobInvalid"));
    const age = ageFrom(y, m, d);
    if (age < 0) return setGoogleError(t("auth.dobFuture"));
    if (age < MIN_AGE) return setGoogleError(t("auth.tooYoung", { age: MIN_AGE }));
    const dob = `${gyyyy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (age < GUARDIAN_AGE) {
      setGuardianError("");
      setGuardianFor({ kind: "google", age, idToken: googleNew.idToken, dob });
      setGoogleNew(null);
      return;
    }
    setBusy(true);
    setGoogleError("");
    try {
      await loginWithGoogle(googleNew.idToken, dob);
      setGoogleNew(null);
    } catch (e) {
      setGoogleError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === signupPassword;
  const pwChecks = passwordChecks(signupPassword);

  const doRegister = () =>
    run(async () => {
      const y = Number(yyyy), m = Number(mm), d = Number(dd);
      if (!fullName.trim()) throw new Error(t("auth.nameRequired"));
      if (phone.trim() && !phoneLooksValid(phone)) throw new Error(t("auth.phoneInvalid"));
      if (!Number.isInteger(y) || y < 1900 || m < 1 || m > 12 || d < 1 || d > 31 || yyyy.length !== 4)
        throw new Error(t("auth.dobInvalid"));
      const age = ageFrom(y, m, d);
      if (age < 0) throw new Error(t("auth.dobFuture"));
      if (age < MIN_AGE) throw new Error(t("auth.tooYoung", { age: MIN_AGE }));
      if (!passwordOk(signupPassword)) throw new Error(t("auth.passwordRule"));
      if (signupPassword !== confirmPassword) throw new Error(t("auth.passwordsMustMatch"));
      const dob = `${yyyy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const input = { name: fullName.trim(), email: signupEmail.trim(), phone: fullPhone(phoneCode, phone), dob, password: signupPassword };
      if (age < GUARDIAN_AGE) {
        setGuardianError("");
        setGuardianFor({ kind: "register", age, input });
        return;
      }
      await register(input);
    });

  // The parent or guardian approved in the pop-up: create the account with their details.
  async function finishWithGuardian(guardian: Guardian) {
    if (!guardianFor) return;
    setBusy(true);
    setGuardianError("");
    try {
      if (guardianFor.kind === "register") await register({ ...guardianFor.input, guardian });
      else await loginWithGoogle(guardianFor.idToken, guardianFor.dob, guardian);
      setGuardianFor(null);
    } catch (e) {
      setGuardianError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const TAB_WIDTH = 88;
  const TAB_GAP = 32;
  const underlineX = scrollX.interpolate({
    inputRange: [0, pageWidth],
    outputRange: [0, TAB_WIDTH + TAB_GAP],
    extrapolate: "clamp",
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.ink }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.outerScroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.heroWrap, { paddingTop: insets.top + spacing.xl }]}>
          {/* Language first, before anything else is read. */}
          <View style={styles.langRow}><LanguagePicker variant="compact" /></View>
          <Image source={require("../../../../assets/images/auth-hero.jpg")} style={styles.hero} />
          <Text style={styles.brand}>ScootMeal</Text>
          <Text style={styles.tagline}>{t("auth.tagline")}</Text>
          <View style={styles.points}>
            {PROMISES.map((p) => (
              <View key={p.icon} style={styles.pointRow}>
                <Ionicons name={p.icon} size={16} color={colors.turmeric} />
                <Text style={styles.pointText}>{t(p.text)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.tabWrap}>
            <View style={styles.tabRow}>
              {TABS.map((key, i) => (
                <Pressable key={key} style={styles.tabBtn} onPress={() => goToTab(i)}>
                  <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]} numberOfLines={1}>{t(key)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.underlineTrack}>
              <Animated.View style={[styles.underline, { transform: [{ translateX: underlineX }] }]} />
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
              useNativeDriver: false,
              listener: onScroll,
            })}
          >
            {/* SIGN IN */}
            <View style={{ width: pageWidth, padding: spacing.xl }}>
              <Text style={styles.label}>{t("auth.email")}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@student.edu.my"
                placeholderTextColor={colors.textFaint}
                testID="login-email"
              />
              <Text style={styles.label}>{t("auth.password")}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, minWidth: 0, borderWidth: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textFaint}
                  onSubmitEditing={doLogin}
                  testID="login-password"
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={12} style={{ paddingRight: spacing.md }} accessibilityRole="button" accessibilityLabel={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.stone} />
                </Pressable>
              </View>

              <Pressable onPress={() => setForgot(true)} hitSlop={14} style={{ alignSelf: "flex-end", marginTop: spacing.sm }} accessibilityRole="button" testID="forgot-link">
                <Text style={[type.small, { textDecorationLine: "underline" }]}>{t("auth.forgot")}</Text>
              </Pressable>

              {activeTab === 0 && error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={doLogin} disabled={busy} testID="login-button">
                <Text style={styles.ctaText}>{busy && activeTab === 0 ? t("auth.signingIn") : t("auth.login")}</Text>
              </Pressable>
              <GoogleOr />
              <GoogleSignInButton onToken={onGoogleToken} onError={(m) => setError(m)} disabled={busy} />
              <Text style={styles.hint}>{t("auth.demoHint")}</Text>
            </View>

            {/* SIGN UP */}
            <View style={{ width: pageWidth, padding: spacing.xl }}>
              <Text style={styles.label}>{t("auth.fullName")}</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder={t("auth.yourName")} placeholderTextColor={colors.textFaint} testID="signup-name" />
              <Text style={styles.label}>{t("auth.email")}</Text>
              <TextInput
                style={styles.input}
                value={signupEmail}
                onChangeText={setSignupEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@student.edu.my"
                placeholderTextColor={colors.textFaint}
                testID="signup-email"
              />
              <Text style={styles.label}>{t("auth.phone")}</Text>
              <PhoneInput code={phoneCode} onCode={setPhoneCode} number={phone} onNumber={setPhone} testID="signup-phone" />
              <Text style={styles.label}>{t("auth.dobMin", { age: MIN_AGE, guardian: GUARDIAN_AGE })}</Text>
              <View style={styles.dobRow}>
                <TextInput style={[styles.input, styles.dobInput, { flex: 1 }]} value={dd} onChangeText={(v) => setDd(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder={t("auth.dd")} placeholderTextColor={colors.textFaint} testID="signup-dd" />
                <TextInput style={[styles.input, styles.dobInput, { flex: 1 }]} value={mm} onChangeText={(v) => setMm(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder={t("auth.mm")} placeholderTextColor={colors.textFaint} testID="signup-mm" />
                <TextInput style={[styles.input, styles.dobInput, { flex: 2 }]} value={yyyy} onChangeText={(v) => setYyyy(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder={t("auth.yyyy")} placeholderTextColor={colors.textFaint} testID="signup-yyyy" />
              </View>
              <Text style={styles.label}>{t("auth.passwordMin")}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  secureTextEntry={!showSignupPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textFaint}
                  testID="signup-password"
                />
                <Pressable onPress={() => setShowSignupPassword((s) => !s)} hitSlop={12} style={{ paddingRight: spacing.md }} accessibilityRole="button" accessibilityLabel={showSignupPassword ? t("auth.hidePassword") : t("auth.showPassword")}>
                  <Ionicons name={showSignupPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.stone} />
                </Pressable>
              </View>
              {signupPassword.length > 0 ? (
                <View style={styles.ruleList} testID="signup-password-rules">
                  {([["length", "auth.ruleLength"], ["number", "auth.ruleNumber"], ["symbol", "auth.ruleSymbol"]] as const).map(([k, label]) => (
                    <View key={k} style={styles.matchRow}>
                      <Ionicons name={pwChecks[k] ? "checkmark-circle" : "ellipse-outline"} size={14} color={pwChecks[k] ? colors.herb : colors.stone} />
                      <Text style={[styles.matchText, { color: pwChecks[k] ? colors.herb : colors.stoneText }]}>{t(label)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={styles.label}>{t("auth.confirmPassword")}</Text>
              <TextInput
                style={[styles.input, confirmPassword.length > 0 && !passwordsMatch && styles.inputBad]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showSignupPassword}
                placeholder={t("auth.confirmPlaceholder")}
                placeholderTextColor={colors.textFaint}
                onSubmitEditing={doRegister}
                testID="signup-password-confirm"
              />
              {confirmPassword.length > 0 ? (
                <View style={styles.matchRow} testID="signup-password-match">
                  <Ionicons name={passwordsMatch ? "checkmark-circle" : "close-circle"} size={14} color={passwordsMatch ? colors.herb : colors.chiliText} />
                  <Text style={[styles.matchText, { color: passwordsMatch ? colors.herb : colors.chiliText }]}>
                    {passwordsMatch ? t("auth.passwordsMatch") : t("auth.passwordsDiffer")}
                  </Text>
                </View>
              ) : null}

              {activeTab === 1 && error ? <Text style={styles.error} testID="signup-error">{error}</Text> : null}

              <Pressable style={[styles.cta, { marginTop: spacing.lg }, busy && { opacity: 0.6 }]} onPress={doRegister} disabled={busy} testID="signup-button">
                <Text style={styles.ctaText}>{busy && activeTab === 1 ? t("auth.creating") : t("auth.createAccount")}</Text>
              </Pressable>
              <GoogleOr />
              <GoogleSignInButton onToken={onGoogleToken} onError={(m) => setError(m)} disabled={busy} label={t("auth.googleSignUp")} />
            </View>
          </ScrollView>
          <View style={{ height: spacing.xxl }} />
        </View>
      </ScrollView>
          <Modal visible={!!googleNew} transparent animationType="fade" onRequestClose={() => setGoogleNew(null)}>
            <View style={styles.gBackdrop}>
              <View style={styles.gCard} testID="google-dob-card">
                <Text style={styles.gTitle}>{t("auth.oneMoreStep")}</Text>
                <Text style={type.small}>{t("auth.googleWelcome", { name: googleNew?.name, email: googleNew?.email, age: MIN_AGE, guardian: GUARDIAN_AGE })}</Text>
                <Text style={[styles.label, { marginTop: spacing.lg }]}>{t("auth.dob")}</Text>
                <View style={styles.dobRow}>
                  <TextInput style={[styles.input, styles.dobInput, { flex: 1 }]} value={gdd} onChangeText={(v) => setGdd(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder={t("auth.dd")} placeholderTextColor={colors.textFaint} testID="google-dd" />
                  <TextInput style={[styles.input, styles.dobInput, { flex: 1 }]} value={gmm} onChangeText={(v) => setGmm(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder={t("auth.mm")} placeholderTextColor={colors.textFaint} testID="google-mm" />
                  <TextInput style={[styles.input, styles.dobInput, { flex: 2 }]} value={gyyyy} onChangeText={(v) => setGyyyy(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder={t("auth.yyyy")} placeholderTextColor={colors.textFaint} testID="google-yyyy" />
                </View>
                {googleError ? <Text style={styles.error} testID="google-error">{googleError}</Text> : null}
                <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={finishGoogle} disabled={busy} testID="google-continue">
                  <Text style={styles.ctaText}>{busy ? t("auth.creating") : t("common.continue")}</Text>
                </Pressable>
                <Pressable onPress={() => setGoogleNew(null)} style={{ alignItems: "center", marginTop: spacing.md }} accessibilityRole="button" testID="google-cancel">
                  <Text style={styles.link}>{t("common.cancel")}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
          <GuardianModal
            visible={!!guardianFor}
            age={guardianFor?.age ?? 0}
            guardianAge={GUARDIAN_AGE}
            busy={busy}
            error={guardianError}
            onCancel={() => { setGuardianFor(null); setGuardianError(""); }}
            onSubmit={finishWithGuardian}
          />
          <ForgotPasswordModal visible={forgot} onClose={() => setForgot(false)} defaultEmail={email} onDone={(e) => { setEmail(e); setPassword(""); }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outerScroll: { flexGrow: 1, backgroundColor: colors.ink },
  heroWrap: { alignItems: "center", paddingTop: spacing.xxl, paddingBottom: 56 },
  langRow: { alignSelf: "stretch", alignItems: "flex-end", paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  brand: { ...font.displayExtraBold, fontSize: 32, color: colors.white, marginTop: spacing.lg, letterSpacing: -0.6 },
  tagline: { ...font.display, fontSize: 16, color: "rgba(255,255,255,0.82)", marginTop: 6, textAlign: "center", paddingHorizontal: spacing.xl },
  points: { marginTop: spacing.lg, gap: 10, paddingHorizontal: spacing.xl },
  pointRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pointText: { ...font.display, fontSize: 15, color: "rgba(255,255,255,0.9)", flexShrink: 1 },
  hero: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.15)",
  },
  card: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -40,
    paddingTop: spacing.xl,
    ...shadow.sheet,
  },
  tabWrap: { width: 208, alignSelf: "center" },
  tabRow: { flexDirection: "row", justifyContent: "space-between" },
  tabBtn: { width: 88, alignItems: "center", paddingBottom: spacing.sm },
  tabText: { ...font.displayBold, fontSize: 16, color: colors.stoneText },
  tabTextActive: { color: colors.ink },
  underlineTrack: {
    height: 2,
    backgroundColor: colors.stoneLine,
    position: "relative",
  },
  underline: {
    position: "absolute",
    width: 88,
    height: 2,
    backgroundColor: colors.turmeric,
    left: 0,
  },
  label: { ...type.small, ...font.displayBold, color: colors.ink, marginBottom: 6, marginTop: spacing.lg },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
    paddingVertical: 12,
    fontSize: 16,
    ...font.serif,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rememberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.turmeric, borderColor: colors.turmeric },
  link: { ...type.small, ...font.displayBold, color: colors.amberText },
  cta: {
    backgroundColor: colors.turmeric,
    borderRadius: radius.pill,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  // ink on amber is 9.2:1; white on amber was 2.0:1 (fails WCAG AA)
  ctaText: { color: colors.ink, ...font.displayBold, fontSize: 16 },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.lg },
  gBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  gCard: { width: "100%", maxWidth: 420, backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.xl },
  gTitle: { ...font.displayBold, fontSize: 20, color: colors.ink, marginBottom: spacing.sm },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...type.small },
  socialLabel: { ...type.small, textAlign: "center", marginTop: spacing.lg },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: spacing.md, marginTop: spacing.md },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { ...type.small, textAlign: "center", marginTop: spacing.md, paddingHorizontal: spacing.xl },
  error: { color: colors.chiliText, ...font.display, fontSize: 14, marginTop: spacing.md },
  dobRow: { flexDirection: "row", gap: spacing.sm },
  dobInput: { minWidth: 0, textAlign: "center" }, // minWidth 0 lets the three boxes share the row on the web too
  inputBad: { borderColor: colors.chili },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  matchText: { ...font.display, fontSize: 12 },
  ruleList: { marginTop: 2 },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  guestText: { ...font.displayBold, fontSize: 14, color: colors.amberText },
});
