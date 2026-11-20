import React from "react";
import { Platform } from "react-native";
import FadeInView from "./FadeInView";

// Screen transitions on web. Phones already slide screens natively (RootNavigator sets the animation per
// screen), but the web build has none, so each screen fades and slides in from the right when it opens.
export default function ScreenTransition({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  return (
    <FadeInView from="right" distance={28} duration={240} style={{ flex: 1 }}>
      {children}
    </FadeInView>
  );
}
