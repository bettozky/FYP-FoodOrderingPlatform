import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { colors, fonts, radius, spacing } from "../../../shared/theme/theme";

// Lets the browser pop-up hand its result back to the app when Google redirects to us.
WebBrowser.maybeCompleteAuthSession();

// The Google "client IDs" are created in Google Cloud Console (see backend/.env.example). Without them the button is simply not shown.
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;

/** True when this build has what Google sign-in needs on the current platform. */
export const googleSignInAvailable = !!webClientId && (Platform.OS === "web" || (Platform.OS === "android" ? !!androidClientId : !!iosClientId));

type Props = { onToken: (idToken: string) => void; onError: (message: string) => void; disabled?: boolean; label?: string };

function Inner({ onToken, onError, disabled, label }: Props) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({ webClientId, androidClientId, iosClientId });

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const token = response.params?.id_token ?? response.authentication?.idToken;
      if (token) onToken(token);
      else onError("Google did not send a sign-in token. Please try again.");
    } else if (response.type === "error") {
      onError(response.error?.message || "Google sign-in failed. Please try again.");
    }
    // "dismiss" / "cancel": the person closed the Google window, so nothing to say.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <Pressable
      style={[styles.btn, (!request || disabled) && { opacity: 0.6 }]}
      onPress={() => promptAsync()}
      disabled={!request || disabled}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      testID="google-button"
    >
      <Ionicons name="logo-google" size={18} color={colors.ink} />
      <Text style={styles.text}>{label ?? "Continue with Google"}</Text>
    </Pressable>
  );
}

export default function GoogleSignInButton(props: Props) {
  if (!googleSignInAvailable) return null;
  return <Inner {...props} />;
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 14 },
  text: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
});
