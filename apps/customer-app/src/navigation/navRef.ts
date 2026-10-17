import { createNavigationContainerRef } from "@react-navigation/native";

// Lets pop-ups (outside the navigator) jump to a screen, e.g. "Pay now" -> the order screen.
export const navRef = createNavigationContainerRef<any>();
