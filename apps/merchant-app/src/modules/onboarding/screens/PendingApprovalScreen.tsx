import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import PrimaryButton from "../../../shared/components/PrimaryButton";
import { errorText } from "../../../shared/api/client";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { pickFile } from "../signup/pickFile";
import { pickKindFor, uploadFile, type FailedUpload } from "../signup/upload";

const MAX_BYTES = 2 * 1024 * 1024;

// FR-5.1: shown until a web admin approves the business. Checks again every few seconds.
// If some sign-up files did not upload, it lists them with the reason and lets the merchant send them again.
export default function PendingApprovalScreen() {
  const { approval, name, checkApproval, logout, failedUploads } = useAuth();
  useEffect(() => {
    const t = setInterval(() => checkApproval().catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [checkApproval]);
  const rejected = approval === "rejected" || approval === "suspended";
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.wrap} testID="pending-approval">
      <Text style={{ fontSize: 56 }}>{rejected ? "⛔" : "⏳"}</Text>
      <Text style={[type.h1, { textAlign: "center" }]}>{rejected ? `Business ${approval}` : "Waiting for approval"}</Text>
      <Text style={[type.bodyMuted, { textAlign: "center" }]}>
        {rejected
          ? `${name} was ${approval} by the ScootMeal admin. Please contact support.`
          : `Thanks for registering ${name}. A ScootMeal admin reviews every new business. This screen updates by itself as soon as you're approved.`}
      </Text>
      {!rejected && failedUploads.length > 0 ? <FailedFiles /> : null}
      <PrimaryButton label="Log out" variant="outline" onPress={logout} style={{ alignSelf: "stretch", marginTop: spacing.lg }} />
    </ScrollView>
  );
}

function FailedFiles() {
  const { failedUploads, setFailedUploads } = useAuth();
  const count = failedUploads.length;
  return (
    <View style={styles.box} accessibilityRole="alert" testID="failed-uploads">
      <Text style={styles.boxTitle}>{count === 1 ? "1 file did not upload" : `${count} files did not upload`}</Text>
      <Text style={type.bodyMuted}>Your shop was still sent for approval. Upload these again so the admin can check them.</Text>
      {failedUploads.map((f) => (
        <FailedRow
          key={`${f.kind}-${f.index ?? ""}`}
          f={f}
          onDone={() => setFailedUploads(failedUploads.filter((x) => x !== f))}
          onFailedAgain={(reason) => setFailedUploads(failedUploads.map((x) => (x === f ? { ...x, reason } : x)))}
        />
      ))}
    </View>
  );
}

function FailedRow({ f, onDone, onFailedAgain }: { f: FailedUpload; onDone: () => void; onFailedAgain: (reason: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function retry() {
    const picked = await pickFile(pickKindFor(f.kind));
    if ("cancelled" in picked) return;
    if ("unavailable" in picked) return onFailedAgain(`${picked.unavailable} Open the merchant app in a web browser to upload it.`);
    if (picked.file.size > MAX_BYTES) return onFailedAgain(`${picked.file.name} is larger than 2 MB. Choose a smaller file.`);
    setBusy(true);
    try {
      await uploadFile(f.kind, picked.file, f.index);
      onDone();
    } catch (e) {
      onFailedAgain(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.label}>{f.label}</Text>
        {f.fileName ? <Text style={type.small} numberOfLines={1}>{f.fileName}</Text> : null}
        <Text style={styles.reason}>{f.reason}</Text>
      </View>
      <Pressable onPress={retry} disabled={busy} accessibilityRole="button" accessibilityLabel={`Upload ${f.label} again`} style={({ pressed }) => [styles.retry, (pressed || busy) && { opacity: 0.6 }]}>
        <Text style={styles.retryText}>{busy ? "Uploading…" : "Upload again"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md, maxWidth: 480, width: "100%", alignSelf: "center" },
  box: { alignSelf: "stretch", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.warning, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  boxTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.warning },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  label: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.text },
  reason: { fontFamily: fonts.serif, fontSize: 13, color: colors.danger },
  retry: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.primary },
});
