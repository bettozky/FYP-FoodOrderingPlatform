import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// True when the phone (or browser) asks for less motion. Every animation in shared/motion checks it,
// so people who get motion sick still get an app that works, just without the movement.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setReduced(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v: boolean) => setReduced(!!v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}
