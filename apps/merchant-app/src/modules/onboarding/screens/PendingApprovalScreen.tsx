import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { colors, spacing, type } from "../../../shared/theme/theme";
import LanguagePicker from "../../../shared/i18n/LanguagePicker";
import { useTranslation } from "react-i18next";

// FR-5.1: shown until a web admin approves the business. Checks again every few seconds.
export default function PendingApprovalScreen() {
  const { approval, name, checkApproval, logout } = useAuth();
  const { t } = useTranslation();
  useEffect(() => {
    const t = setInterval(() => checkApproval().catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [checkApproval]);
  const rejected = approval === "rejected" || approval === "suspended";
  return (
    <View style={styles.wrap} testID="pending-approval">
      <LanguagePicker style={{ alignSelf: "center" }} />
      <Ionicons name={rejected ? "close-circle" : "time"} size={64} color={rejected ? colors.chili : colors.turmericDeep} />
      <Text style={[type.h1, { textAlign: "center" }]}>{rejected ? (approval === "suspended" ? t("pending.suspended") : t("pending.rejected")) : t("pending.waiting")}</Text>
      <Text style={[type.bodyMuted, { textAlign: "center" }]}>
        {rejected
          ? (approval === "suspended" ? t("pending.suspendedBody", { name }) : t("pending.rejectedBody", { name }))
          : t("pending.waitingBody", { name })}
      </Text>
      <PrimaryButton label={t("drawer.logout")} variant="outline" onPress={logout} style={{ alignSelf: "stretch", marginTop: spacing.lg }} />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md, maxWidth: 480, width: "100%", alignSelf: "center" },
});
