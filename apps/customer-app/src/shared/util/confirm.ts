import { Alert, Platform } from "react-native";

/** Yes/no question that also works in the browser build (Alert.alert does nothing on web). */
export function confirmAsync(title: string, message: string, okLabel = "Yes"): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, onPress: () => resolve(true) },
    ])
  );
}

/** A message with one OK button that also works in the browser build. */
export function alertAsync(title: string, message: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    return Promise.resolve();
  }
  return new Promise((resolve) => Alert.alert(title, message, [{ text: "OK", onPress: () => resolve() }], { onDismiss: () => resolve() }));
}
