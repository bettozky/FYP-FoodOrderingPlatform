import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import PhotoField from "../../shared/components/PhotoField";
import ScreenHeader from "../../shared/components/ScreenHeader";
import { api, errorText } from "../../shared/api/client";
import { LocalFile, form } from "../../shared/util/files";
import { confirmAsync } from "../../shared/util/confirm";
import { colors, spacing, type, font } from "../../shared/theme/theme";
import { useLive } from "../orders/LiveDataContext";
import { useTranslation } from "react-i18next";

// The shop's profile photo (logo) and banner. Customers see them on the shop card and the shop page.
// A photo is uploaded as soon as it is chosen.
export default function ShopProfileScreen() {
  const { profile, refresh } = useLive();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const upload = async (kind: "logo" | "cover", file: LocalFile) => {
    setBusy(true); setErr(""); setMsg("");
    try {
      await api("POST", "/merchant/shop-photo", await form({ kind }, { file }));
      await refresh();
      setMsg(kind === "logo" ? t("shop.logoUpdated") : t("shop.bannerUpdated"));
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (kind: "logo" | "cover") => {
    if (!(await confirmAsync(kind === "logo" ? t("shop.removeLogo") : t("shop.removeBanner"), t("shop.removeBody"), t("photo.remove")))) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      await api("DELETE", `/merchant/shop-photo?kind=${kind}`);
      await refresh();
      setMsg(t("shop.removed"));
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t("drawer.shopProfile")} subtitle={profile?.name ?? ""} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={type.bodyMuted}>{t("shop.intro")}</Text>
        <PhotoField label={t("shop.logo")} shape="round" aspect={[1, 1]} current={profile?.logo} busy={busy} onPick={(f) => upload("logo", f)} onRemove={() => remove("logo")} />
        <PhotoField label={t("shop.banner")} aspect={[16, 9]} current={profile?.cover} busy={busy} onPick={(f) => upload("cover", f)} onRemove={() => remove("cover")} />
        <Text style={type.small}>{t("shop.dishPhotos")}</Text>
        {msg ? <Text style={{ color: colors.herb, fontSize: 14 }}>{msg}</Text> : null}
        {err ? <Text style={{ color: colors.chiliText, fontSize: 14 }}>{err}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 } });
