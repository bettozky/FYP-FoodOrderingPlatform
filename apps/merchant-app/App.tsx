import React, { useCallback } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/modules/auth/AuthContext";
import { LiveDataProvider } from "./src/modules/orders/LiveDataContext";
import { ChatProvider } from "./src/modules/chat/ChatContext";
import { CallProvider } from "./src/modules/calls/CallContext";
import PopupHost from "./src/modules/notifications/PopupHost";
import RootNavigator from "./src/navigation/RootNavigator";
import AppDrawer from "./src/navigation/AppDrawer";
import { navRef } from "./src/navigation/navRef";
import { DrawerProvider } from "./src/shared/components/SideDrawer";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  // The app uses the platform's own font (SF Pro / Roboto), so there is nothing to load before the first frame.
  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LiveDataProvider>
          <DrawerProvider>
          <NavigationContainer ref={navRef}>
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
              <StatusBar style="dark" />
              <CallProvider>
                <ChatProvider>
                  <RootNavigator />
                  <AppDrawer />
                  <PopupHost />
                </ChatProvider>
              </CallProvider>
            </View>
          </NavigationContainer>
          </DrawerProvider>
        </LiveDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
