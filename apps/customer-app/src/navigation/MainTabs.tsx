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
import { DrawerEdge } from "../shared/components/SideDrawer";
import { useLive } from "../modules/ordering/LiveDataContext";
import PayBar from "../modules/ordering/components/PayBar";
import PressableScale from "../shared/motion/PressableScale";
import { PopOnChange } from "../shared/motion/PulseRing";
import { useTranslation } from "react-i18next";

// Main sections, swipeable left/right or chosen from the bottom bar (new layout, Oct 2026):
// Home · Orders · (Assistant, raised in the middle) · Tables · Account.
// Loyalty moved under Account, as the layout plan asks for 5 tabs at most.
// The screens are plain components, not nested navigator routes, so `navigation` is passed down.
// Route keys stay the same ("book" = Tables) because other screens jump to them:
//   navigation.popTo("MainTabs", { tab: "book", nonce: Date.now() })

type TabKey = "home" | "orders" | "assistant" | "book" | "account";
// `title` is a translation key (tabs.*), shown with t().
const ROUTES = [
  { key: "home", title: "tabs.home", icon: "home-outline", iconOn: "home" },
  { key: "orders", title: "tabs.orders", icon: "receipt-outline", iconOn: "receipt" },
  { key: "assistant", title: "tabs.assistant", icon: "sparkles", iconOn: "sparkles" },
  { key: "book", title: "tabs.tables", icon: "calendar-outline", iconOn: "calendar" },
  { key: "account", title: "tabs.account", icon: "person-outline", iconOn: "person" },
] as const satisfies readonly { key: TabKey; title: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap }[];

export const TAB_BAR_HEIGHT = 64;

export default function MainTabs({ navigation, route }: any) {
  const layout = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const { notifications } = useLive();
  const unread = notifications.length;

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
        navigationState={{ index, routes: ROUTES as unknown as { key: string; title: string }[] }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={() => null}
        swipeEnabled
      />

      {/* Swipe from the left edge of Home to open the side menu. */}
      {ROUTES[index].key === "home" ? <DrawerEdge top={insets.top + 70} bottom={TAB_BAR_HEIGHT + insets.bottom + 20} /> : null}

      {/* While an order is confirmed but unpaid, keep a "Pay now" bar on Home and Orders (even if the top banner was swiped away). */}
      {(ROUTES[index].key === "home" || ROUTES[index].key === "orders") && (
        <PayBar bottom={TAB_BAR_HEIGHT + insets.bottom + 8} onPress={(orderId) => navigation.navigate("Pay", { orderId })} />
      )}

      <View style={[styles.bar, { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom }]} accessibilityRole="tablist">
        {ROUTES.map((r, i) => {
          const focused = i === index;
          if (r.key === "assistant") {
            return (
              <PressableScale key={r.key} scaleTo={0.88} style={styles.item} onPress={() => setIndex(i)} hitSlop={6} testID={`tab-${r.key}`} accessibilityRole="tab" accessibilityLabel={t("tabs.aiAssistant")} accessibilityState={{ selected: focused }}>
                <View style={[styles.centerBtn, focused && styles.centerBtnOn]}>
                  <PopOnChange trigger={focused}>
                    <Ionicons name="sparkles" size={24} color={colors.ink} />
                  </PopOnChange>
                </View>
              </PressableScale>
            );
          }
          return (
            <PressableScale key={r.key} scaleTo={0.9} style={styles.item} onPress={() => setIndex(i)} hitSlop={6} testID={`tab-${r.key}`} accessibilityRole="tab" accessibilityLabel={t(r.title)} accessibilityState={{ selected: focused }}>
              {/* The icon bounces when its tab becomes the active one. */}
              <View>
                <PopOnChange trigger={focused}>
                  <Ionicons name={focused ? r.iconOn : r.icon} size={22} color={focused ? colors.turmericDeep : colors.stone} />
                </PopOnChange>
                {r.key === "account" && unread > 0 ? <View style={styles.dot} /> : null}
              </View>
              <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>{t(r.title)}</Text>
            </PressableScale>
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
  dot: { position: "absolute", top: -2, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.chili, borderWidth: 1.5, borderColor: colors.paper },
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
