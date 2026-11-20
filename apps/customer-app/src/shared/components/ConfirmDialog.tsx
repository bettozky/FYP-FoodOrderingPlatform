import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, spacing, ui } from "../theme/theme";

// A styled yes/no (or OK-only) dialog. On phones `confirmAsync` / `alertAsync` use the native alert, which is
// what iOS and Android users expect; in the browser build they open this instead of the plain window.confirm.
// <ConfirmHost /> is mounted once near the root of the app.
export type DialogRequest = {
  title: string;
  message: string;
  okLabel: string;
  cancelLabel?: string; // absent = one-button alert
  destructive?: boolean;
  resolve: (ok: boolean) => void;
};

let show: ((r: DialogRequest) => void) | null = null;

/** Opens the dialog if the host is mounted; returns false when it is not (callers then fall back). */
export function openDialog(r: DialogRequest): boolean {
  if (!show) return false;
  show(r);
  return true;
}

export function ConfirmHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);
  useEffect(() => {
    show = setReq;
    return () => { show = null; };
  }, []);
  if (!req) return null;
  const finish = (ok: boolean) => { req.resolve(ok); setReq(null); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => finish(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          <Text style={styles.title}>{req.title}</Text>
          {req.message ? <Text style={styles.message}>{req.message}</Text> : null}
          <View style={styles.buttons}>
            {req.cancelLabel ? (
              <Pressable style={({ pressed }) => [ui.buttonOutline, styles.btn, pressed && { opacity: 0.8 }]} onPress={() => finish(false)} accessibilityRole="button" testID="dialog-cancel">
                <Text style={ui.buttonOutlineText}>{req.cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [req.destructive ? styles.danger : ui.buttonDark, styles.btn, pressed && { opacity: 0.85 }]}
              onPress={() => finish(true)}
              accessibilityRole="button"
              testID="dialog-ok"
            >
              <Text style={ui.buttonDarkText}>{req.okLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 360, backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  title: { ...font.displayExtraBold, fontSize: 19, color: colors.ink, letterSpacing: -0.2 },
  message: { ...font.serif, fontSize: 15, lineHeight: 21, color: colors.stoneText },
  buttons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  btn: { flex: 1 },
  danger: { ...ui.buttonDark, backgroundColor: colors.chiliText },
});
