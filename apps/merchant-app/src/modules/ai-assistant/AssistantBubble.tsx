// Floating assistant button, like iPhone AssistiveTouch.
// Drag it anywhere; when you let go it snaps to the nearest side. Tap it to open the assistant.
// It shows only after the merchant is logged in and approved.
import React, { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../../shared/theme/theme";
import AssistantPanel from "./AssistantPanel";

const SIZE = 56; // bubble width and height
const MARGIN = 12; // gap from the screen edge
const TAP_SLOP = 6; // moving less than this many pixels counts as a tap, not a drag

export default function AssistantBubble() {
  const { isLoggedIn, approval } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  // The PanResponder below is created once, so it reads the latest screen size from this ref.
  const bounds = useRef({ width, top: 0, bottom: 0 });
  bounds.current = {
    width,
    top: insets.top + MARGIN,
    bottom: height - insets.bottom - SIZE - MARGIN,
  };

  // Where the bubble rests (right side, a bit below the middle at first).
  const last = useRef({ x: width - SIZE - MARGIN, y: height * 0.6 });
  const pos = useRef(new Animated.ValueXY(last.current)).current;
  const dragStart = useRef({ x: 0, y: 0 });

  // Snap to the nearest side and keep it inside the safe area.
  function snapTo(x: number, y: number) {
    const b = bounds.current;
    const toX = x + SIZE / 2 < b.width / 2 ? MARGIN : b.width - SIZE - MARGIN;
    const toY = Math.min(Math.max(y, b.top), b.bottom);
    last.current = { x: toX, y: toY };
    Animated.spring(pos, { toValue: last.current, friction: 7, useNativeDriver: false }).start();
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pos.stopAnimation();
        dragStart.current = { ...last.current };
      },
      onPanResponderMove: (_e, g) => {
        pos.setValue({ x: dragStart.current.x + g.dx, y: dragStart.current.y + g.dy });
      },
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP) {
          pos.setValue(last.current); // undo the tiny wobble
          setOpen(true);
          return;
        }
        snapTo(dragStart.current.x + g.dx, dragStart.current.y + g.dy);
      },
      onPanResponderTerminate: () => snapTo(last.current.x, last.current.y),
    })
  ).current;

  // Window resized or phone rotated: keep the bubble on screen.
  useEffect(() => {
    snapTo(last.current.x, last.current.y);
  }, [width, height]);

  if (!isLoggedIn || approval !== "approved") return null;

  return (
    <>
      {/* Hidden while the assistant is open, so it never shows on top of voice mode */}
      {!open && (
        <Animated.View
          {...pan.panHandlers}
          style={[styles.bubble, { transform: pos.getTranslateTransform() }]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Open ScootMeal assistant"
          onAccessibilityTap={() => setOpen(true)}
        >
          <Ionicons name="sparkles" size={26} color={colors.turmeric} />
        </Animated.View>
      )}
      <AssistantPanel visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});