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
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, type, radius, fonts, shadow } from "../../theme/theme";

const TABS = ["Sign In", "Sign Up"];

export default function AuthScreen() {
  const { login, loginAsGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 520); // matches the centered card on wide/web viewports

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState(0);

  // sign in
  const [email, setEmail] = useState("badrul@student.swinburne.edu.my");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // sign up
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");

  function goToTab(i: number) {
    setActiveTab(i);
    scrollRef.current?.scrollTo({ x: i * pageWidth, animated: true });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== activeTab) setActiveTab(i);
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
          <Image source={require("../../../assets/images/auth-hero.jpg")} style={styles.hero} />
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
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8} style={{ paddingRight: spacing.md }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.stone} />
                </Pressable>
              </View>

              <View style={styles.rememberRow}>
                <Pressable style={styles.checkboxRow} onPress={() => setRememberMe((r) => !r)}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color={colors.white} />}
                  </View>
                  <Text style={type.small}>Remember me</Text>
                </Pressable>
                <Pressable hitSlop={6}>
                  <Text style={styles.link}>Forgot password?</Text>
                </Pressable>
              </View>

              <Pressable style={styles.cta} onPress={() => login(email.split("@")[0])}>
                <Text style={styles.ctaText}>Login</Text>
              </Pressable>
            </View>

            {/* SIGN UP */}
            <View style={{ width: pageWidth, padding: spacing.xl }}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={colors.textFaint}
              />
              <Text style={styles.label}>E-mail address</Text>
              <TextInput
                style={styles.input}
                value={signupEmail}
                onChangeText={setSignupEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@student.edu.my"
                placeholderTextColor={colors.textFaint}
              />
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+60 1x-xxx xxxx"
                placeholderTextColor={colors.textFaint}
              />

              <Pressable
                style={[styles.cta, { marginTop: spacing.lg }]}
                onPress={() => login(fullName || signupEmail.split("@")[0])}
              >
                <Text style={styles.ctaText}>Create account</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.socialLabel}>Sign in using:</Text>
          <View style={styles.socialRow}>
            <View style={styles.socialBtn}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
            </View>
            <View style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={18} color="#1877F2" />
            </View>
            <View style={styles.socialBtn}>
              <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
            </View>
          </View>

          <Pressable style={styles.guestRow} onPress={loginAsGuest}>
            <Text style={styles.guestText}>Continue as guest</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.turmericDeep} />
          </Pressable>
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
  ctaText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 15 },
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
