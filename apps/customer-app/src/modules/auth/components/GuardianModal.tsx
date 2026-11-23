import React, { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import PhoneInput, { fullPhone, phoneLooksValid } from "../../../shared/components/PhoneInput";
import { colors, spacing, type, radius, fonts, shadow } from "../../../shared/theme/theme";

export type Guardian = { name: string; phone: string; consent: true };

type Props = {
  visible: boolean;
  age: number;
  guardianAge: number;
  busy?: boolean;
  /** Error from the server (for example a rejected phone number), shown inside the pop-up. */
  error?: string;
  onCancel: () => void;
  onSubmit: (guardian: Guardian) => void;
};

/** Shown when the date of birth makes the user younger than guardianAge: a parent or guardian must approve the account. */
export default function GuardianModal({ visible, age, guardianAge, busy, error, onCancel, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("+60");
  const [number, setNumber] = useState("");
  const [agree, setAgree] = useState(false);
  const [problem, setProblem] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    if (visible) setProblem("");
  }, [visible]);

  function submit() {
    if (!name.trim()) return setProblem(t("guardian.nameRequired"));
    if (!phoneLooksValid(number)) return setProblem(t("guardian.phoneRequired"));
    if (!agree) return setProblem(t("guardian.consentRequired"));
    setProblem("");
    onSubmit({ name: name.trim(), phone: fullPhone(code, number), consent: true });
  }

  const message = problem || error;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={styles.card} testID="guardian-card">
            <View style={styles.iconWrap}>
              <Ionicons name="people-outline" size={26} color={colors.amberText} />
            </View>
            <Text style={styles.title}>{t("guardian.title")}</Text>
            <Text style={styles.body}>{t("guardian.body", { age, guardian: guardianAge })}</Text>

            <Text style={styles.label}>{t("guardian.nameLabel")}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t("auth.fullName")} placeholderTextColor={colors.textFaint} testID="guardian-name" />

            <Text style={styles.label}>{t("guardian.phoneLabel")}</Text>
            <PhoneInput code={code} onCode={setCode} number={number} onNumber={setNumber} testID="guardian-phone" />

            <Pressable style={styles.checkRow} onPress={() => setAgree((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }} testID="guardian-consent">
              <View style={[styles.checkbox, agree && styles.checkboxOn]}>{agree ? <Ionicons name="checkmark" size={14} color={colors.ink} /> : null}</View>
              <Text style={styles.checkText}>{t("guardian.consent")}</Text>
            </Pressable>

            {message ? <Text style={styles.error} testID="guardian-error">{message}</Text> : null}

            <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} testID="guardian-continue">
              <Text style={styles.ctaText}>{busy ? t("auth.creating") : t("guardian.approve")}</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={{ alignItems: "center", marginTop: spacing.md }} accessibilityRole="button" testID="guardian-cancel">
              <Text style={styles.link}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 420, backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.xl, ...shadow.card },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.amberTint, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: spacing.md },
  title: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink, textAlign: "center", marginBottom: spacing.sm },
  body: { ...type.bodyMuted, textAlign: "center" },
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
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.lg },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.stoneSoft, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxOn: { backgroundColor: colors.turmeric, borderColor: colors.turmeric },
  checkText: { ...type.small, flex: 1, lineHeight: 17 },
  error: { color: colors.chiliText, fontFamily: fonts.display, fontSize: 13, marginTop: spacing.md },
  cta: { backgroundColor: colors.turmeric, borderRadius: radius.md, paddingVertical: 15, alignItems: "center", marginTop: spacing.lg },
  ctaText: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 15 },
  link: { ...type.small, color: colors.turmericDeep },
});
