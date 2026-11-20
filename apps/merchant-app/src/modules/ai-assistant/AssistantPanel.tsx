// The assistant panel that slides up when the bubble is tapped.
// The dark background fades in/out; the white sheet slides up/down. The glow fades with them.
// The test buttons are TEMPORARY, so you can see each glow mode; they go once voice controls the glow.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../shared/theme/theme";
import EdgeGlow, { type GlowMode } from "./EdgeGlow";

type Props = { visible: boolean; onClose: () => void };

const TEST_MODES: GlowMode[] = ["listening", "thinking", "speaking", "idle"];
const OPEN_MS = 260;
const CLOSE_MS = 220;
const useNative = Platform.OS !== "web"; // the browser can't use the native animation driver

export default function AssistantPanel({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<GlowMode>("listening");

  // `shown` keeps the Modal on screen while the closing animation plays.
  const [shown, setShown] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(400); // measured once the sheet is drawn
  const progress = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = open

  useEffect(() => {
    if (visible) {
      setShown(true);
      Animated.timing(progress, { toValue: 1, duration: OPEN_MS, useNativeDriver: useNative }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: CLOSE_MS, useNativeDriver: useNative }).start(
        ({ finished }) => {
          if (finished) setShown(false); // only hide after the animation has played
        }
      );
    }
  }, [visible]);

  const sheetSlide = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] });

  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={onClose}>
      {/* Dark background: fades */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close assistant"
        />
      </Animated.View>

      {/* White sheet: slides, sitting at the bottom of the screen */}
      <View style={styles.bottom} pointerEvents="box-none">
        <Animated.View
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
          style={[styles.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: sheetSlide }] }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>ScootMeal Assistant</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>
          <Text style={styles.body}>
            Hi! Soon you'll be able to ask me about your orders, sales and menu, by typing or by voice.
          </Text>

          {/* TEMPORARY: glow test buttons */}
          <View style={styles.chips}>
            {TEST_MODES.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.chip, mode === m && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
              >
                <Text style={[styles.chipText, mode === m && styles.chipTextOn]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Glow: fades out as soon as closing starts (visible becomes false) */}
      <EdgeGlow mode={visible ? mode : "idle"} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.overlay },
  bottom: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  body: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, color: colors.stoneText },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.stoneLine,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.serifMedium, fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.white },
});