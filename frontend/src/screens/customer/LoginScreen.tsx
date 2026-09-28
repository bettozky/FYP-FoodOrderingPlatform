import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useAuth } from "../../context/AuthContext";
import PrimaryButton from "../../components/PrimaryButton";
import { colors, spacing, type, radius } from "../../theme/theme";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState("badrul@student.swinburne.edu.my");
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🛴 ScootMeal</Text>
        <Text style={type.bodyMuted}>Search by dish. Order in seconds.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@student.edu.my"
            placeholderTextColor={colors.textFaint}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
          />

          <PrimaryButton
            label="Log in"
            style={{ marginTop: spacing.lg }}
            onPress={() => login(email.split("@")[0])}
          />
          <PrimaryButton
            label="Create an account"
            variant="outline"
            style={{ marginTop: spacing.sm }}
            onPress={() => navigation.navigate("Signup")}
          />
        </View>

        <Text style={styles.hint}>Demo build — any email/password logs you in.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: spacing.xl, justifyContent: "center" },
  logo: { fontSize: 32, fontWeight: "800", color: colors.text, marginBottom: 4 },
  form: { marginTop: spacing.xxl, gap: spacing.xs },
  label: { ...type.small, marginBottom: 4, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { ...type.small, textAlign: "center", marginTop: spacing.xl },
});
