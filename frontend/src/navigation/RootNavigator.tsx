import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

import AuthScreen from "../screens/customer/AuthScreen";
import MainTabs from "./MainTabs";
import DishDetailScreen from "../screens/customer/DishDetailScreen";
import CartScreen from "../screens/customer/CartScreen";
import CheckoutScreen from "../screens/customer/CheckoutScreen";
import OrderTrackingScreen from "../screens/customer/OrderTrackingScreen";
import LiveTrackingScreen from "../screens/customer/LiveTrackingScreen";
import MerchantDashboardScreen from "../screens/merchant/MerchantDashboardScreen";
import MerchantOrderQueueScreen from "../screens/merchant/MerchantOrderQueueScreen";
import MerchantMenuScreen from "../screens/merchant/MerchantMenuScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {!isLoggedIn ? (
        <Stack.Group>
          <Stack.Screen name="Login" component={AuthScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="DishDetail" component={DishDetailScreen} options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
          <Stack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
          <Stack.Screen name="MerchantOrderQueue" component={MerchantOrderQueueScreen} />
          <Stack.Screen name="MerchantMenu" component={MerchantMenuScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
