import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import PhotoField from "../../shared/components/PhotoField";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { api, errorText } from "../../shared/api/client";
import { LocalFile, form } from "../../shared/util/files";
import { confirmAsync } from "../../shared/util/confirm";
import { colors, spacing, type } from "../../shared/theme/theme";
import { useLive } from "../orders/LiveDataContext";

// The shop's profile photo (logo) and banner. Customers see them on the shop card and the shop page.
// A photo is uploaded as soon as it is chosen.
export default function ShopProfileScreen() {
  const { profile, refresh } = useLive();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const upload = async (kind: "logo" | "cover", file: LocalFile) => {
    setBusy(true); setErr(""); setMsg("");
    try {
      await api("POST", "/merchant/shop-photo", await form({ kind }, { file }));
      await refresh();
      setMsg(kind === "logo" ? "Profile photo updated." : "Banner updated.");
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (kind: "logo" | "cover") => {
    if (!(await confirmAsync(kind === "logo" ? "Remove the profile photo?" : "Remove the banner?", "Customers will see the default picture instead.", "Remove"))) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      await api("DELETE", `/merchant/shop-photo?kind=${kind}`);
      await refresh();
      setMsg("Removed.");
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Shop profile & photos" subtitle={profile?.name ?? ""} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={type.bodyMuted}>Good photos help hungry students pick your shop. Choose from your gallery or take one now; it is shrunk automatically.</Text>
        <PhotoField label="Profile photo (logo)" shape="round" aspect={[1, 1]} current={profile?.logo} busy={busy} onPick={(f) => upload("logo", f)} onRemove={() => remove("logo")} />
        <PhotoField label="Banner photo" aspect={[16, 9]} current={profile?.cover} busy={busy} onPick={(f) => upload("cover", f)} onRemove={() => remove("cover")} />
        <Text style={type.small}>Dish photos are set on the Menu page: tap a dish, then "Edit".</Text>
        {msg ? <Text style={{ color: colors.herb, fontSize: 13.5 }}>{msg}</Text> : null}
        {err ? <Text style={{ color: colors.chiliText, fontSize: 13.5 }}>{err}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 } });
