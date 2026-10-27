import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../modules/auth/AuthContext";

import AuthScreen from "../modules/auth/screens/AuthScreen";
import MainTabs from "./MainTabs";
import DishDetailScreen from "../modules/discovery/screens/DishDetailScreen";
import CartScreen from "../modules/ordering/screens/CartScreen";
import CheckoutScreen from "../modules/ordering/screens/CheckoutScreen";
import OrderTrackingScreen from "../modules/ordering/screens/OrderTrackingScreen";
import BookTableScreen from "../modules/dine-in/screens/BookTableScreen";
import JobsScreen from "../modules/jobs/screens/JobsScreen";
import LiveTrackingScreen from "../modules/delivery/screens/LiveTrackingScreen";
import FavouritesScreen from "../modules/favourites/FavouritesScreen";
import AddressesScreen from "../modules/account/screens/AddressesScreen";
import PaymentsScreen from "../modules/account/screens/PaymentsScreen";
import NotificationsScreen from "../modules/notifications/NotificationsScreen";
import HelpScreen from "../modules/account/screens/HelpScreen";
import LoyaltyScreen from "../modules/loyalty/screens/LoyaltyScreen";

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
          <Stack.Screen name="BookTable" component={BookTableScreen} />
          <Stack.Screen name="Jobs" component={JobsScreen} />
          <Stack.Screen name="Favourites" component={FavouritesScreen} />
          <Stack.Screen name="Addresses" component={AddressesScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          {/* Loyalty left the bottom bar in the new layout; opened from Account. */}
          <Stack.Screen name="Loyalty" component={LoyaltyScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
