import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { errorText } from "../../../shared/api/client";
import { confirmAsync } from "../../../shared/util/confirm";
import Avatar from "../../../shared/components/Avatar";
import { pickImage } from "../../../shared/util/files";
import { useAuth } from "../../auth/AuthContext";

// "Edit profile": change name / phone, and change password. Both are saved on the server.
export default function ProfileScreen() {
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
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async () => {
    if (!name.trim()) return setProfileMsg({ ok: false, text: "Your name cannot be empty." });
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setProfileMsg({ ok: true, text: "Profile saved." });
    } catch (e) {
      setProfileMsg({ ok: false, text: errorText(e) });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!current || !next) return setPwMsg({ ok: false, text: "Fill in both password boxes." });
    setSavingPw(true);
    setPwMsg(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setPwMsg({ ok: true, text: "Password changed. Your other devices were signed out." });
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
    if (!delPw) return setDelMsg({ ok: false, text: "Type your password to confirm." });
    if (!(await confirmAsync("Delete your account?", "This cannot be undone. Your saved addresses, saved dishes and notifications are erased, and your reviews show as \"Deleted user\".", "Delete"))) return;
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
      <ScreenHeader title="Edit profile" subtitle="Your name and phone are shown to stalls and riders on your orders." />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={[styles.card, { alignItems: "center" }]}>
          <Avatar uri={user?.avatar} name={user?.name} size={96} />
          {photoBusy ? <ActivityIndicator color={colors.ink} /> : (
            <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap", justifyContent: "center" }}>
              <Pressable onPress={() => changePhoto("library")} style={styles.photoBtn} accessibilityRole="button" testID="photo-library"><Text style={styles.photoBtnText}>Choose photo</Text></Pressable>
              {Platform.OS !== "web" ? <Pressable onPress={() => changePhoto("camera")} style={styles.photoBtn} accessibilityRole="button" testID="photo-camera"><Text style={styles.photoBtnText}>Take photo</Text></Pressable> : null}
              {user?.avatar ? <Pressable onPress={() => changePhoto("remove")} style={styles.photoBtn} accessibilityRole="button" testID="photo-remove"><Text style={[styles.photoBtnText, { color: colors.danger }]}>Remove</Text></Pressable> : null}
            </View>
          )}
          {photoMsg ? <Text style={{ color: colors.danger, fontSize: 13, textAlign: "center" }}>{photoMsg}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={type.bodyMuted}>Email (cannot be changed)</Text>
          <Text style={type.body}>{user?.email}</Text>
          <Text style={[type.bodyMuted, { marginTop: spacing.sm }]}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} testID="profile-name" />
          <Text style={type.bodyMuted}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} testID="profile-phone" />
          <Msg m={profileMsg} />
          <Pressable style={styles.btn} onPress={saveProfile} disabled={savingProfile} accessibilityRole="button" testID="save-profile">
            {savingProfile ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.btnText}>Save profile</Text>}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={type.h3}>Change password</Text>
          <TextInput style={styles.input} value={current} onChangeText={setCurrent} placeholder="Current password" placeholderTextColor={colors.textFaint} secureTextEntry autoCapitalize="none" testID="pw-current" />
          <TextInput style={styles.input} value={next} onChangeText={setNext} placeholder="New password (at least 6 characters)" placeholderTextColor={colors.textFaint} secureTextEntry autoCapitalize="none" testID="pw-new" />
          <Msg m={pwMsg} />
          <Pressable style={styles.btn} onPress={savePassword} disabled={savingPw} accessibilityRole="button" testID="save-password">
            {savingPw ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.btnText}>Change password</Text>}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[type.h3, { color: colors.danger }]}>Delete account</Text>
          <Text style={type.bodyMuted}>Removes your account and personal data. You cannot do this while an order or table booking is still open.</Text>
          <TextInput style={styles.input} value={delPw} onChangeText={setDelPw} placeholder="Your password" placeholderTextColor={colors.textFaint} secureTextEntry autoCapitalize="none" testID="delete-password" />
          <Msg m={delMsg} />
          <Pressable style={[styles.btn, { backgroundColor: colors.danger }]} onPress={removeAccount} disabled={deleting} accessibilityRole="button" testID="delete-account">
            {deleting ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.btnText, { color: colors.white }]}>Delete my account</Text>}
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
  photoBtn: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  photoBtnText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  btnText: { fontFamily: fonts.displayBold, color: colors.ink },
});
