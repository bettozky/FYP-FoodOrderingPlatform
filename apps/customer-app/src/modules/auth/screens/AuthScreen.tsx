import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { colors, spacing, type, radius, fonts, shadow } from "../../../shared/theme/theme";

const TABS = ["Sign In", "Sign Up"];
const MIN_AGE = 18; // FR-1.2 (the number is an assumption to confirm with the client; the server enforces it too)

function ageFrom(y: number, m: number, d: number) {
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 520); // matches the centered card on wide/web viewports

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // sign in (demo account pre-filled for the prototype)
  const [email, setEmail] = useState("demo@scootmeal.test");
  const [password, setPassword] = useState("demo123");
  const [showPassword, setShowPassword] = useState(false);

  // sign up
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

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

  const doRegister = () =>
    run(async () => {
      const y = Number(yyyy), m = Number(mm), d = Number(dd);
      if (!fullName.trim()) throw new Error("Enter your full name");
      if (!Number.isInteger(y) || y < 1900 || m < 1 || m > 12 || d < 1 || d > 31 || yyyy.length !== 4)
        throw new Error("Enter your date of birth as day, month and 4-digit year");
      if (ageFrom(y, m, d) < MIN_AGE) throw new Error(`You must be at least ${MIN_AGE} years old to use ScootMeal.`);
      const dob = `${yyyy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      await register({ name: fullName.trim(), email: signupEmail.trim(), phone: phone.trim(), dob, password: signupPassword });
    });

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
          <Image source={require("../../../../assets/images/auth-hero.jpg")} style={styles.hero} />
        </View>

        <View style={styles.card}>
          <View style={styles.tabWrap}>
            <View style={styles.tabRow}>
              {TABS.map((t, i) => (
                <Pressable key={t} style={styles.tabBtn} onPress={() => goToTab(i)}>
                  <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t}</Text>
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
              <Text style={styles.label}>E-mail address</Text>
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
              <Text style={styles.label}>Enter password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textFaint}
                  onSubmitEditing={doLogin}
                  testID="login-password"
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={12} style={{ paddingRight: spacing.md }} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.stone} />
                </Pressable>
              </View>

              {activeTab === 0 && error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={doLogin} disabled={busy} testID="login-button">
                <Text style={styles.ctaText}>{busy && activeTab === 0 ? "Signing in…" : "Login"}</Text>
              </Pressable>
              <Text style={styles.hint}>An account is required to order. Demo account: demo@scootmeal.test / demo123</Text>
            </View>

            {/* SIGN UP */}
            <View style={{ width: pageWidth, padding: spacing.xl }}>
              <Text style={styles.label}>Full name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={colors.textFaint} testID="signup-name" />
              <Text style={styles.label}>E-mail address</Text>
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
              <Text style={styles.label}>Phone number</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+60 1x-xxx xxxx" placeholderTextColor={colors.textFaint} />
              <Text style={styles.label}>Date of birth (must be {MIN_AGE}+)</Text>
              <View style={styles.dobRow}>
                <TextInput style={[styles.input, { flex: 1, textAlign: "center" }]} value={dd} onChangeText={(t) => setDd(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="DD" placeholderTextColor={colors.textFaint} testID="signup-dd" />
                <TextInput style={[styles.input, { flex: 1, textAlign: "center" }]} value={mm} onChangeText={(t) => setMm(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="MM" placeholderTextColor={colors.textFaint} testID="signup-mm" />
                <TextInput style={[styles.input, { flex: 2, textAlign: "center" }]} value={yyyy} onChangeText={(t) => setYyyy(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="YYYY" placeholderTextColor={colors.textFaint} testID="signup-yyyy" />
              </View>
              <Text style={styles.label}>Password (6+ characters)</Text>
              <TextInput style={styles.input} value={signupPassword} onChangeText={setSignupPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.textFaint} testID="signup-password" />

              {activeTab === 1 && error ? <Text style={styles.error} testID="signup-error">{error}</Text> : null}

              <Pressable style={[styles.cta, { marginTop: spacing.lg }, busy && { opacity: 0.6 }]} onPress={doRegister} disabled={busy} testID="signup-button">
                <Text style={styles.ctaText}>{busy && activeTab === 1 ? "Creating…" : "Create account"}</Text>
              </Pressable>
            </View>
          </ScrollView>
          <View style={{ height: spacing.xxl }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outerScroll: { flexGrow: 1, backgroundColor: colors.ink },
  heroWrap: { alignItems: "center", paddingTop: spacing.xxl, paddingBottom: 56 },
  hero: {
    width: 160,
    height: 160,
    borderRadius: 80,
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
  tabText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.textFaint },
  tabTextActive: { color: colors.turmeric },
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
  label: { ...type.small, marginBottom: 4, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.serif,
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
  link: { ...type.small, color: colors.turmericDeep },
  cta: {
    backgroundColor: colors.turmeric,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.xl,
    ...shadow.card,
  },
  // ink on amber is 9.2:1; white on amber was 2.0:1 (fails WCAG AA)
  ctaText: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 15 },
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
  error: { color: colors.chili, fontFamily: fonts.display, fontSize: 13, marginTop: spacing.md },
  dobRow: { flexDirection: "row", gap: spacing.sm },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  guestText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.turmericDeep },
});
