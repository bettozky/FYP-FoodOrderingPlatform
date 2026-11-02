import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, spacing } from "../theme/theme";

// A side menu that slides in from the left. Open it with the menu button (useDrawer().open) or by swiping from the
// left edge (<DrawerEdge />); close it by tapping outside, tapping an item, or swiping it back to the left.

type DrawerCtx = { isOpen: boolean; open: () => void; close: () => void };
const Ctx = createContext<DrawerCtx>({ isOpen: false, open: () => {}, close: () => {} });
export const useDrawer = () => useContext(Ctx);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export type DrawerItem =
  | { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: number; danger?: boolean }
  | { key: string; section: string };

export function SideDrawer({ header, items }: { header: React.ReactNode; items: DrawerItem[] }) {
  const { isOpen, close } = useDrawer();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelWidth = Math.min(330, Math.round(width * 0.82));
  const x = useRef(new Animated.Value(-panelWidth)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== "web" }).start();
    } else if (mounted) {
      Animated.timing(x, { toValue: -panelWidth, duration: 180, useNativeDriver: Platform.OS !== "web" }).start(({ finished }) => finished && setMounted(false));
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => x.setValue(Math.max(-panelWidth, Math.min(0, g.dx))),
      onPanResponderRelease: (_, g) => (g.dx < -panelWidth / 4 || g.vx < -0.5 ? close() : Animated.timing(x, { toValue: 0, duration: 120, useNativeDriver: Platform.OS !== "web" }).start()),
      onPanResponderTerminate: () => Animated.timing(x, { toValue: 0, duration: 120, useNativeDriver: Platform.OS !== "web" }).start(),
    }),
  ).current;

  if (!mounted) return null;
  const shade = x.interpolate({ inputRange: [-panelWidth, 0], outputRange: [0, 0.45] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="drawer">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: shade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View {...pan.panHandlers} style={[styles.panel, { width: panelWidth, paddingTop: insets.top + spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md), transform: [{ translateX: x }] }]}>
        <View style={styles.header}>{header}</View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          {items.map((it) =>
            "section" in it ? (
              <Text key={it.key} style={styles.section}>{it.section}</Text>
            ) : (
              <Pressable key={it.key} style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.paperDim }]} onPress={() => { close(); it.onPress(); }} accessibilityRole="button" accessibilityLabel={it.label} testID={`drawer-${it.key}`}>
                <Ionicons name={it.icon} size={21} color={it.danger ? colors.chili : colors.ink} />
                <Text style={[styles.itemText, it.danger && { color: colors.chili }]}>{it.label}</Text>
                {it.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{it.badge > 99 ? "99+" : it.badge}</Text></View> : null}
              </Pressable>
            ),
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/** A thin invisible strip on the left edge of a screen: swipe right from it to open the menu. */
export function DrawerEdge({ top = 80, bottom = 90 }: { top?: number; bottom?: number }) {
  const { open } = useDrawer();
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => g.dx > 30 && open(),
    }),
  ).current;
  return <View {...pan.panHandlers} style={{ position: "absolute", left: 0, top, bottom, width: 18 }} />;
}

/** The ☰ button that opens the menu. `badge` shows a small red dot with a count. */
export function MenuButton({ badge, style }: { badge?: number; style?: object }) {
  const { open } = useDrawer();
  return (
    <Pressable onPress={open} hitSlop={8} style={[styles.menuBtn, style]} accessibilityRole="button" accessibilityLabel={badge ? `Menu, ${badge} unread` : "Menu"} testID="menu-button">
      <Ionicons name="menu" size={22} color={colors.ink} />
      {badge ? <View style={styles.dot}><Text style={styles.dotText}>{badge > 9 ? "9+" : badge}</Text></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.paper, borderTopRightRadius: radius.lg, borderBottomRightRadius: radius.lg, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, elevation: 16 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.stoneLine, marginBottom: spacing.sm },
  section: { fontFamily: fonts.displayBold, fontSize: 11.5, letterSpacing: 0.6, color: colors.stoneText, textTransform: "uppercase", paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: 2 },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.lg },
  itemText: { flex: 1, fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.chili, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.white, fontSize: 11.5, fontFamily: fonts.displayBold },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.stoneLine },
  dot: { position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.chili, alignItems: "center", justifyContent: "center" },
  dotText: { color: colors.white, fontSize: 10.5, fontFamily: fonts.displayBold },
});
