import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { colors, spacing, type } from "../../../shared/theme/theme";

// FR-5.1: shown until a web admin approves the business. Checks again every few seconds.
export default function PendingApprovalScreen() {
  const { approval, name, checkApproval, logout } = useAuth();
  useEffect(() => {
    const t = setInterval(() => checkApproval().catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [checkApproval]);
  const rejected = approval === "rejected" || approval === "suspended";
  return (
    <View style={styles.wrap} testID="pending-approval">
      <Ionicons name={rejected ? "close-circle" : "time"} size={64} color={rejected ? colors.chili : colors.turmericDeep} />
      <Text style={[type.h1, { textAlign: "center" }]}>{rejected ? `Business ${approval}` : "Waiting for approval"}</Text>
      <Text style={[type.bodyMuted, { textAlign: "center" }]}>
        {rejected
          ? `${name} was ${approval} by the ScootMeal admin. Please contact support.`
          : `Thanks for registering ${name}. A ScootMeal admin reviews every new business. This screen updates by itself as soon as you're approved.`}
      </Text>
      <PrimaryButton label="Log out" variant="outline" onPress={logout} style={{ alignSelf: "stretch", marginTop: spacing.lg }} />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md, maxWidth: 480, width: "100%", alignSelf: "center" },
});
