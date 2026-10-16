import { Alert, Platform } from "react-native";

/** Yes/no question that also works in the browser build (Alert.alert does nothing on web). */
export function confirmAsync(title: string, message: string, okLabel = "Yes"): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, onPress: () => resolve(true) },
    ])
  );
}
