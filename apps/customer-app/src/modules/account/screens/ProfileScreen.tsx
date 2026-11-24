import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { errorText } from "../../../shared/api/client";
import { confirmAsync } from "../../../shared/util/confirm";
import { passwordChecks, passwordOk } from "../../../shared/util/password";
import PhoneInput, { fullPhone, phoneLooksValid, splitPhone } from "../../../shared/components/PhoneInput";
import { Ionicons } from "@expo/vector-icons";
import Avatar from "../../../shared/components/Avatar";
import { pickImage } from "../../../shared/util/files";
import { useAuth } from "../../auth/AuthContext";

// "Edit profile": change name / phone, and change password. Both are saved on the server.
export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, updateProfile, changePassword, deleteAccount, setAvatar } = useAuth();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const changePhoto = async (source: "library" | "camera" | "remove") => {
    setPhotoMsg("");
    setPhotoBusy(true);
    try {
      if (source === "remove") { await setAvatar(null); return; }
      const file = await pickImage(source, [1, 1]);
      if (file) await setAvatar(file);
    } catch (e) {
      setPhotoMsg(errorText(e));
    } finally {
      setPhotoBusy(false);
    }
  };
  const [name, setName] = useState(user?.name ?? "");
  const [phoneCode, setPhoneCode] = useState(() => splitPhone(user?.phone).code);
  const [phone, setPhone] = useState(() => splitPhone(user?.phone).number);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const nextChecks = passwordChecks(next);
  const nextMatches = confirmNext.length > 0 && confirmNext === next;
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async () => {
    if (!name.trim()) return setProfileMsg({ ok: false, text: t("profile.nameEmpty") });
    if (phone.trim() && !phoneLooksValid(phone)) return setProfileMsg({ ok: false, text: t("auth.phoneInvalid") });
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name: name.trim(), phone: fullPhone(phoneCode, phone) });
      setProfileMsg({ ok: true, text: t("profile.saved") });
    } catch (e) {
      setProfileMsg({ ok: false, text: errorText(e) });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!current || !next) return setPwMsg({ ok: false, text: t("profile.fillBoth") });
    if (!passwordOk(next)) return setPwMsg({ ok: false, text: t("auth.passwordRule") });
    if (next !== confirmNext) return setPwMsg({ ok: false, text: t("auth.passwordsMustMatch") });
    setSavingPw(true);
    setPwMsg(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirmNext("");
      setPwMsg({ ok: true, text: t("profile.pwChanged") });
    } catch (e) {
      setPwMsg({ ok: false, text: errorText(e) });
    } finally {
      setSavingPw(false);
    }
  };

  const [delPw, setDelPw] = useState("");
  const [delMsg, setDelMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const removeAccount = async () => {
    if (!delPw) return setDelMsg({ ok: false, text: t("profile.typePassword") });
    if (!(await confirmAsync(t("profile.deleteConfirmTitle"), t("profile.deleteConfirmText"), t("common.delete")))) return;
    setDeleting(true);
    setDelMsg(null);
    try {
      await deleteAccount(delPw); // success signs you out
    } catch (e) {
      setDelMsg({ ok: false, text: errorText(e) });
      setDeleting(false);
    }
  };

  const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) =>
    m ? <Text style={{ color: m.ok ? colors.herb : colors.danger, fontSize: 13 }}>{m.text}</Text> : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={[styles.card, { alignItems: "center" }]}>
          <Avatar uri={user?.avatar} name={user?.name} size={96} />
          {photoBusy ? <ActivityIndicator color={colors.ink} /> : (
            <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap", justifyContent: "center" }}>
              <Pressable onPress={() => changePhoto("library")} style={styles.photoBtn} accessibilityRole="button" testID="photo-library"><Text style={styles.photoBtnText}>{t("profile.choosePhoto")}</Text></Pressable>
              {Platform.OS !== "web" ? <Pressable onPress={() => changePhoto("camera")} style={styles.photoBtn} accessibilityRole="button" testID="photo-camera"><Text style={styles.photoBtnText}>{t("profile.takePhoto")}</Text></Pressable> : null}
              {user?.avatar ? <Pressable onPress={() => changePhoto("remove")} style={styles.photoBtn} accessibilityRole="button" testID="photo-remove"><Text style={[styles.photoBtnText, { color: colors.danger }]}>{t("profile.removePhoto")}</Text></Pressable> : null}
            </View>
          )}
          {photoMsg ? <Text style={{ color: colors.danger, fontSize: 13, textAlign: "center" }}>{photoMsg}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={type.bodyMuted}>{t("profile.emailFixed")}</Text>
          <Text style={type.body}>{user?.email}</Text>
          <Text style={[type.bodyMuted, { marginTop: spacing.sm }]}>{t("profile.name")}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} testID="profile-name" />
          <Text style={type.bodyMuted}>{t("stall.phone")}</Text>
          <PhoneInput code={phoneCode} onCode={setPhoneCode} number={phone} onNumber={setPhone} testID="profile-phone" />
          <Msg m={profileMsg} />
          <Pressable style={styles.btn} onPress={saveProfile} disabled={savingProfile} accessibilityRole="button" testID="save-profile">
            {savingProfile ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.btnText}>{t("profile.save")}</Text>}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={type.h3}>{t("forgot.change")}</Text>
          <TextInput style={styles.input} value={current} onChangeText={setCurrent} placeholder={t("profile.currentPw")} placeholderTextColor={colors.textFaint} secureTextEntry autoCapitalize="none" testID="pw-current" />
          <TextInput style={styles.input} value={next} onChangeText={setNext} placeholder={t("forgot.newPassword")} placeholderTextColor={colors.textFaint} secureTextEntry autoCapitalize="none" testID="pw-new" />
          {next.length > 0 ? (
            <View testID="pw-rules">
              {([["length", "auth.ruleLength"], ["number", "auth.ruleNumber"], ["symbol", "auth.ruleSymbol"]] as const).map(([k, label]) => (
                <View key={k} style={styles.ruleRow}>
                  <Ionicons name={nextChecks[k] ? "checkmark-circle" : "ellipse-outline"} size={14} color={nextChecks[k] ? colors.herb : colors.stone} />
                  <Text style={[styles.ruleText, { color: nextChecks[k] ? colors.herb : colors.stoneText }]}>{t(label)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <TextInput
            style={[styles.input, confirmNext.length > 0 && !nextMatches && { borderColor: colors.chili }]}
            value={confirmNext}
            onChangeText={setConfirmNext}
            placeholder={t("profile.confirmNewPw")}
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoCapitalize="none"
            testID="pw-new-confirm"
          />
          {confirmNext.length > 0 ? (
            <View style={styles.ruleRow} testID="pw-match">
              <Ionicons name={nextMatches ? "checkmark-circle" : "close-circle"} size={14} color={nextMatches ? colors.herb : colors.chiliText} />
              <Text style={[styles.ruleText, { color: nextMatches ? colors.herb : colors.chiliText }]}>{nextMatches ? t("auth.passwordsMatch") : t("auth.passwordsDiffer")}</Text>
            </View>
          ) : null}
          <Msg m={pwMsg} />
          <Pressable style={styles.btn} onPress={savePassword} disabled={savingPw} accessibilityRole="button" testID="save-password">
            {savingPw ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.btnText}>{t("forgot.change")}</Text>}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[type.h3, { color: colors.danger }]}>{t("profile.deleteTitle")}</Text>
          <Text style={type.bodyMuted}>{t("profile.deleteText")}</Text>
          <TextInput style={styles.input} value={delPw} onChangeText={setDelPw} placeholder={t("profile.yourPassword")} placeholderTextColor={colors.textFaint} secureTextEntry autoCapitalize="none" testID="delete-password" />
          <Msg m={delMsg} />
          <Pressable style={[styles.btn, { backgroundColor: colors.danger }]} onPress={removeAccount} disabled={deleting} accessibilityRole="button" testID="delete-account">
            {deleting ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.btnText, { color: colors.white }]}>{t("profile.deleteButton")}</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 3 },
  card: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, color: colors.ink, backgroundColor: colors.bg },
  btn: { minHeight: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.turmeric, marginTop: spacing.xs },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ruleText: { fontFamily: fonts.display, fontSize: 12 },
  photoBtn: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  photoBtnText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  btnText: { fontFamily: fonts.displayBold, color: colors.ink },
});
