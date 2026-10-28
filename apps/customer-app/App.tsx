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
import { CartProvider } from "./src/modules/ordering/CartContext";
import { LiveDataProvider } from "./src/modules/ordering/LiveDataContext";
import { CatalogProvider } from "./src/modules/discovery/CatalogContext";
import { FavouritesProvider } from "./src/modules/favourites/FavouritesContext";
import { ChatProvider } from "./src/modules/chat/ChatContext";
import { CallProvider } from "./src/modules/calls/CallContext";
import GlobalPopups from "./src/modules/notifications/GlobalPopups";
import PayBanner from "./src/modules/notifications/PayBanner";
import { navRef } from "./src/navigation/navRef";
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
        <FavouritesProvider>
        <CatalogProvider>
          <CartProvider>
            <LiveDataProvider>
              <NavigationContainer ref={navRef}>
                <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                  <StatusBar style="dark" />
                  <CallProvider>
                    <ChatProvider>
                      <RootNavigator />
                      <GlobalPopups />
                      <PayBanner />
                    </ChatProvider>
                  </CallProvider>
                </View>
              </NavigationContainer>
            </LiveDataProvider>
          </CartProvider>
        </CatalogProvider>
        </FavouritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
