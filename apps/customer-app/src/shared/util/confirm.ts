import { Alert, Platform } from "react-native";
import i18n from "i18next";
import { openDialog } from "../components/ConfirmDialog";

// Phones use the native alert (what iOS and Android users expect). The browser build opens the app's own
// styled dialog (<ConfirmHost />), falling back to the browser's box if the host is not mounted.

/** Yes/no question that also works in the browser build (Alert.alert does nothing on web). */
export function confirmAsync(title: string, message: string, okLabel = i18n.t("common.yes")): Promise<boolean> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const destructive = /delete|remove|cancel|withdraw/i.test(okLabel);
      if (!openDialog({ title, message, okLabel, cancelLabel: "Not now", destructive, resolve })) {
        resolve(typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`));
      }
    });
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: i18n.t("common.cancel"), style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, onPress: () => resolve(true) },
    ])
  );
}

/** A message with one OK button that also works in the browser build. */
export function alertAsync(title: string, message: string): Promise<void> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      if (!openDialog({ title, message, okLabel: "OK", resolve: () => resolve() })) {
        if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
        resolve();
      }
    });
  }
  return new Promise((resolve) => Alert.alert(title, message, [{ text: i18n.t("common.ok"), onPress: () => resolve() }], { onDismiss: () => resolve() }));
}
