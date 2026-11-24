import { Alert, Platform } from "react-native";
import i18n from "i18next";

/** Yes/no question that also works in the browser build (Alert.alert does nothing on web). */
export function confirmAsync(title: string, message: string, okLabel = i18n.t("common.yes")): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: i18n.t("common.cancel"), style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, onPress: () => resolve(true) },
    ])
  );
}
