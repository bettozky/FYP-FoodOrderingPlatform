import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/customer/HomeScreen";
import OrdersScreen from "../screens/customer/OrdersScreen";
import LoyaltyScreen from "../screens/customer/LoyaltyScreen";
import AccountScreen from "../screens/customer/AccountScreen";
import { colors } from "../theme/theme";

const Tab = createBottomTabNavigator();

const icons: Record<string, string> = {
  Home: "🔍",
  Orders: "🧾",
  Loyalty: "🎁",
  Account: "👤",
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{icons[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Loyalty" component={LoyaltyScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
