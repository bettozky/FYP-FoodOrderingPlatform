import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../modules/auth/AuthContext";

import PendingApprovalScreen from "../modules/onboarding/screens/PendingApprovalScreen";
import MerchantLoginScreen from "../modules/auth/screens/MerchantLoginScreen";
import MerchantDashboardScreen from "../modules/dashboard/screens/MerchantDashboardScreen";
import MerchantOrderQueueScreen from "../modules/orders/screens/MerchantOrderQueueScreen";
import MerchantMenuScreen from "../modules/menu/screens/MerchantMenuScreen";
import MerchantVouchersScreen from "../modules/promotions/screens/MerchantVouchersScreen";
import MerchantAnalyticsScreen from "../modules/analytics/screens/MerchantAnalyticsScreen";
import MerchantReservationsScreen from "../modules/reservations/screens/MerchantReservationsScreen";
import MerchantJobBoardScreen from "../modules/jobs/screens/MerchantJobBoardScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isLoggedIn, approval } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {!isLoggedIn ? (
        <Stack.Screen name="MerchantLogin" component={MerchantLoginScreen} />
      ) : approval !== "approved" ? (
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
          <Stack.Screen name="MerchantOrderQueue" component={MerchantOrderQueueScreen} />
          <Stack.Screen name="MerchantMenu" component={MerchantMenuScreen} />
          <Stack.Screen name="MerchantVouchers" component={MerchantVouchersScreen} />
          <Stack.Screen name="MerchantAnalytics" component={MerchantAnalyticsScreen} />
          <Stack.Screen name="MerchantReservations" component={MerchantReservationsScreen} />
          <Stack.Screen name="MerchantJobBoard" component={MerchantJobBoardScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
