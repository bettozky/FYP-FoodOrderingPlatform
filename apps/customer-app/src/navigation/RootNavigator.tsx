import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../modules/auth/AuthContext";

import AuthScreen from "../modules/auth/screens/AuthScreen";
import MainTabs from "./MainTabs";
import DishDetailScreen from "../modules/discovery/screens/DishDetailScreen";
import StallScreen from "../modules/discovery/screens/StallScreen";
import CartScreen from "../modules/ordering/screens/CartScreen";
import CheckoutScreen from "../modules/ordering/screens/CheckoutScreen";
import OrderTrackingScreen from "../modules/ordering/screens/OrderTrackingScreen";
import PayScreen from "../modules/ordering/screens/PayScreen";
import BookTableScreen from "../modules/dine-in/screens/BookTableScreen";
import JobsScreen from "../modules/jobs/screens/JobsScreen";
import JobDetailScreen from "../modules/jobs/screens/JobDetailScreen";
import ApplyJobScreen from "../modules/jobs/screens/ApplyJobScreen";
import MyApplicationsScreen from "../modules/jobs/screens/MyApplicationsScreen";
import AnnouncementsScreen from "../modules/announcements/AnnouncementsScreen";
import LiveTrackingScreen from "../modules/delivery/screens/LiveTrackingScreen";
import FavouritesScreen from "../modules/favourites/FavouritesScreen";
import AddressesScreen from "../modules/account/screens/AddressesScreen";
import PaymentsScreen from "../modules/account/screens/PaymentsScreen";
import NotificationsScreen from "../modules/notifications/NotificationsScreen";
import MyReviewsScreen from "../modules/reviews/MyReviewsScreen";
import ProfileScreen from "../modules/account/screens/ProfileScreen";
import HelpScreen from "../modules/account/screens/HelpScreen";
import LoyaltyScreen from "../modules/loyalty/screens/LoyaltyScreen";

import ScreenTransition from "../shared/motion/ScreenTransition";

// Screen transitions (task 1). Phones animate natively: most screens slide in from the right, these ones differ.
// The web build has no native transitions, so ScreenTransition fades and slides each screen in instead.
const SCREEN_ANIMATION: Record<string, "slide_from_bottom" | "fade" | "fade_from_bottom"> = {
  DishDetail: "slide_from_bottom",
  Cart: "slide_from_bottom",
  Pay: "slide_from_bottom",
  OrderTracking: "fade",
  CanteenMap: "fade_from_bottom",
};

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={({ route }) => ({ headerShown: false, animation: SCREEN_ANIMATION[route.name] ?? "slide_from_right", animationDuration: 280, gestureEnabled: true })}
      screenLayout={({ children }) => <ScreenTransition>{children}</ScreenTransition>}
    >
      {!isLoggedIn ? (
        <Stack.Group>
          <Stack.Screen name="Login" component={AuthScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="DishDetail" component={DishDetailScreen} options={{ animation: "slide_from_bottom" }} />
          {/* Stall menu: navigation.navigate("Stall", { merchantId }) */}
          <Stack.Screen name="Stall" component={StallScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          {/* Step 3 of an order: choose card, FPX or cash. navigation.navigate("Pay", { orderId }) */}
          <Stack.Screen name="Pay" component={PayScreen} />
          <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
          <Stack.Screen name="BookTable" component={BookTableScreen} />
          <Stack.Screen name="Jobs" component={JobsScreen} />
          <Stack.Screen name="JobDetail" component={JobDetailScreen} />
          <Stack.Screen name="ApplyJob" component={ApplyJobScreen} />
          <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
          <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
          <Stack.Screen name="Favourites" component={FavouritesScreen} />
          <Stack.Screen name="Addresses" component={AddressesScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          {/* Loyalty left the bottom bar in the new layout; opened from Account. */}
          <Stack.Screen name="Loyalty" component={LoyaltyScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
