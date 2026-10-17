import React, { useCallback } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { AuthProvider } from "./src/modules/auth/AuthContext";
import { LiveDataProvider } from "./src/modules/orders/LiveDataContext";
import { ChatProvider } from "./src/modules/chat/ChatContext";
import { CallProvider } from "./src/modules/calls/CallContext";
import PopupHost from "./src/modules/notifications/PopupHost";
import RootNavigator from "./src/navigation/RootNavigator";
import { colors } from "./src/shared/theme/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LiveDataProvider>
          <NavigationContainer>
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
              <StatusBar style="dark" />
              <CallProvider>
                <ChatProvider>
                  <RootNavigator />
                  <PopupHost />
                </ChatProvider>
              </CallProvider>
            </View>
          </NavigationContainer>
        </LiveDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
