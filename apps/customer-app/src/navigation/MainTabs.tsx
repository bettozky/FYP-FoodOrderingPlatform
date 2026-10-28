import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Text, useWindowDimensions } from "react-native";
import { TabView, SceneMap } from "react-native-tab-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../modules/discovery/screens/HomeScreen";
import OrdersScreen from "../modules/ordering/screens/OrdersScreen";
import ReservationsScreen from "../modules/dine-in/screens/ReservationsScreen";
import AIAssistantScreen from "../modules/ai-assistant/screens/AIAssistantScreen";
import AccountScreen from "../modules/account/screens/AccountScreen";
import { colors, fonts, shadow } from "../shared/theme/theme";
import PayBar from "../modules/ordering/components/PayBar";

// Main sections, swipeable left/right or chosen from the bottom bar (new layout, Oct 2026):
// Home · Orders · (Assistant, raised in the middle) · Tables · Account.
// Loyalty moved under Account, as the layout plan asks for 5 tabs at most.
// The screens are plain components, not nested navigator routes, so `navigation` is passed down.
// Route keys stay the same ("book" = Tables) because other screens jump to them:
//   navigation.popTo("MainTabs", { tab: "book", nonce: Date.now() })

type TabKey = "home" | "orders" | "assistant" | "book" | "account";
const ROUTES: { key: TabKey; title: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap }[] = [
  { key: "home", title: "Home", icon: "home-outline", iconOn: "home" },
  { key: "orders", title: "Orders", icon: "receipt-outline", iconOn: "receipt" },
  { key: "assistant", title: "Assistant", icon: "sparkles", iconOn: "sparkles" },
  { key: "book", title: "Tables", icon: "calendar-outline", iconOn: "calendar" },
  { key: "account", title: "Account", icon: "person-outline", iconOn: "person" },
];

export const TAB_BAR_HEIGHT = 64;

export default function MainTabs({ navigation, route }: any) {
  const layout = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  // Other screens can jump to a tab: navigation.popTo("MainTabs", { tab: "book" })
  useEffect(() => {
    const i = ROUTES.findIndex((r) => r.key === route?.params?.tab);
    if (i >= 0) setIndex(i);
  }, [route?.params?.tab, route?.params?.nonce]);

  const renderScene = SceneMap({
    home: () => <HomeScreen navigation={navigation} />,
    orders: () => <OrdersScreen navigation={navigation} />,
    assistant: () => <AIAssistantScreen />,
    book: () => <ReservationsScreen navigation={navigation} />,
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

      {/* While an order is confirmed but unpaid, keep a "Pay now" bar on Home and Orders (even if the top banner was swiped away). */}
      {(ROUTES[index].key === "home" || ROUTES[index].key === "orders") && (
        <PayBar bottom={TAB_BAR_HEIGHT + insets.bottom + 8} onPress={(orderId) => navigation.navigate("Pay", { orderId })} />
      )}

      <View style={[styles.bar, { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom }]} accessibilityRole="tablist">
        {ROUTES.map((r, i) => {
          const focused = i === index;
          if (r.key === "assistant") {
            return (
              <Pressable key={r.key} style={styles.item} onPress={() => setIndex(i)} hitSlop={6} testID={`tab-${r.key}`} accessibilityRole="tab" accessibilityLabel="AI assistant" accessibilityState={{ selected: focused }}>
                <View style={[styles.centerBtn, focused && styles.centerBtnOn]}>
                  <Ionicons name="sparkles" size={24} color={colors.ink} />
                </View>
              </Pressable>
            );
          }
          return (
            <Pressable key={r.key} style={styles.item} onPress={() => setIndex(i)} hitSlop={6} testID={`tab-${r.key}`} accessibilityRole="tab" accessibilityLabel={r.title} accessibilityState={{ selected: focused }}>
              <Ionicons name={focused ? r.iconOn : r.icon} size={22} color={focused ? colors.turmericDeep : colors.stone} />
              <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>{r.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.stoneLine,
    ...shadow.sheet,
  },
  item: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontFamily: fonts.display, fontSize: 11, color: colors.stoneText },
  labelOn: { color: colors.ink, fontFamily: fonts.displayBold },
  // Raised round button in the middle; sits half above the bar.
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -26,
    backgroundColor: colors.turmeric,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.paper,
    ...shadow.floating,
  },
  centerBtnOn: { backgroundColor: colors.turmericLight },
});
