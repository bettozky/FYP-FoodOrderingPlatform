import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { TabView, SceneMap } from "react-native-tab-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../modules/discovery/screens/HomeScreen";
import OrdersScreen from "../modules/ordering/screens/OrdersScreen";
import ReservationsScreen from "../modules/dine-in/screens/ReservationsScreen";
import LoyaltyScreen from "../modules/loyalty/screens/LoyaltyScreen";
import AIAssistantScreen from "../modules/ai-assistant/screens/AIAssistantScreen";
import AccountScreen from "../modules/account/screens/AccountScreen";
import SideMenu from "../shared/components/SideMenu";
import { colors, radius, shadow } from "../shared/theme/theme";

// Swipeable home section pager: swipe left/right (or tap the floating pill
// nav) to move between Home / Orders / Assistant / Loyalty / Account. The
// screens themselves are plain components (not nested navigator routes), so
// `navigation` is threaded down manually — it's the same stack-level
// navigation object every screen already expects.

const ROUTES = [
  { key: "home", title: "Home", icon: "home" as const },
  { key: "orders", title: "Orders", icon: "receipt" as const },
  { key: "book", title: "Book", icon: "calendar" as const },
  { key: "assistant", title: "Assistant", icon: "sparkles" as const },
  { key: "loyalty", title: "Loyalty", icon: "gift" as const },
  { key: "account", title: "Account", icon: "person" as const },
];

export default function MainTabs({ navigation, route }: any) {
  const layout = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Other screens can jump to a tab: navigation.popTo("MainTabs", { tab: "book" })
  useEffect(() => {
    const i = ROUTES.findIndex((r) => r.key === route?.params?.tab);
    if (i >= 0) setIndex(i);
  }, [route?.params?.tab, route?.params?.nonce]);

  const renderScene = SceneMap({
    home: () => <HomeScreen navigation={navigation} onMenuPress={() => setMenuOpen(true)} />,
    orders: () => <OrdersScreen navigation={navigation} />,
    book: () => <ReservationsScreen navigation={navigation} />,
    assistant: () => <AIAssistantScreen />,
    loyalty: () => <LoyaltyScreen />,
    account: () => <AccountScreen navigation={navigation} />,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TabView
        navigationState={{ index, routes: ROUTES }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={() => null}
        swipeEnabled
      />

      <View style={[styles.pill, { bottom: Math.max(insets.bottom, 8) + 12 }, shadow.floating]}>
        {ROUTES.map((r, i) => {
          const focused = i === index;
          const isAssistant = r.key === "assistant";
          return (
            <Pressable key={r.key} style={styles.item} onPress={() => setIndex(i)} hitSlop={6} testID={`tab-${r.key}`} accessibilityRole="tab" accessibilityLabel={r.title} accessibilityState={{ selected: focused }}>
              {isAssistant ? (
                <View style={styles.glowWrap}>
                  <View style={styles.glowRing} />
                  <View style={[styles.assistantBtn, focused && styles.assistantBtnFocused]}>
                    <Ionicons name="sparkles" size={24} color={colors.ink} />
                  </View>
                </View>
              ) : (
                <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
                  <Ionicons name={r.icon} size={19} color={focused ? colors.ink : "#8A867D"} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        goToTab={(i) => setIndex(i)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  item: { alignItems: "center", justifyContent: "center", width: 46, height: 64 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  iconWrapFocused: { backgroundColor: colors.turmeric },
  glowWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
  },
  glowRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.turmeric,
    opacity: 0.35,
    shadowColor: colors.turmeric,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
  },
  assistantBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.turmeric,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.ink,
    shadowColor: colors.turmeric,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  assistantBtnFocused: { backgroundColor: "#FFC24D" },
});
