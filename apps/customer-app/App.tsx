import "./src/shared/i18n"; // English / Bahasa Melayu / 中文: must load before any screen
import React, { useCallback } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
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
import { DrawerProvider } from "./src/shared/components/SideDrawer";
import AppDrawer from "./src/navigation/AppDrawer";
import RootNavigator from "./src/navigation/RootNavigator";
import { ConfirmHost } from "./src/shared/components/ConfirmDialog";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  // The app uses the platform's own font (SF Pro / Roboto), so there is nothing to load before the first frame.
  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavouritesProvider>
        <CatalogProvider>
          <CartProvider>
            <LiveDataProvider>
              <DrawerProvider>
              <NavigationContainer ref={navRef}>
                <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                  <StatusBar style="dark" />
                  <CallProvider>
                    <ChatProvider>
                      <RootNavigator />
                      <GlobalPopups />
                      <PayBanner />
                      <AppDrawer />
                      <ConfirmHost />
                    </ChatProvider>
                  </CallProvider>
                </View>
              </NavigationContainer>
              </DrawerProvider>
            </LiveDataProvider>
          </CartProvider>
        </CatalogProvider>
        </FavouritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
