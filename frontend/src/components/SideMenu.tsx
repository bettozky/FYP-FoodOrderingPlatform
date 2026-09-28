import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { loyalty } from "../data/mockData";
import { colors, radius, spacing, type, fonts } from "../theme/theme";

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  goToTab: (index: number) => void;
  navigation: any;
};

// Quick-access drawer opened from Home's hamburger icon. Mirrors the app's
// main sections plus a few natural additions for a food-delivery app
// (favourites, saved addresses, payment methods, notifications, help) that
// don't have dedicated screens yet in this build — tapping them just closes
// the drawer for now, the same "stub" treatment the Account screen already
// uses for its own menu rows.

export default function SideMenu({ visible, onClose, goToTab, navigation }: Props) {
  const { name, isGuest, logout, setRole } = useAuth();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-320)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -320, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const sections: MenuItem[] = [
    { icon: "home", label: "Home", onPress: () => goToTab(0) },
    { icon: "receipt", label: "My Orders", onPress: () => goToTab(1) },
    { icon: "sparkles", label: "AI Assistant", onPress: () => goToTab(2) },
    { icon: "gift", label: "Loyalty & Vouchers", onPress: () => goToTab(3) },
  ];

  const more: MenuItem[] = [
    { icon: "heart", label: "Favourites", onPress: onClose },
    { icon: "location", label: "Delivery Addresses", onPress: onClose },
    { icon: "card", label: "Payment Methods", onPress: onClose },
    { icon: "notifications", label: "Notifications", onPress: onClose },
    { icon: "help-circle", label: "Help & Support", onPress: onClose },
  ];

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { paddingTop: insets.top + spacing.lg, transform: [{ translateX }] }]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name || "S")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name || "Guest"}</Text>
            <Text style={styles.sub}>{isGuest ? "Browsing as guest" : `${loyalty.tier} · ${loyalty.points} pts`}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.paper} />
          </Pressable>
        </View>

        <View style={styles.section}>
          {sections.map((m) => (
            <Pressable key={m.label} style={styles.row} onPress={() => run(m.onPress)}>
              <Ionicons name={m.icon} size={18} color={colors.turmeric} />
              <Text style={styles.rowLabel}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          {more.map((m) => (
            <Pressable key={m.label} style={styles.row} onPress={() => run(m.onPress)}>
              <Ionicons name={m.icon} size={18} color="#B8B3A6" />
              <Text style={styles.rowLabelMuted}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          style={styles.row}
          onPress={() =>
            run(() => {
              setRole("merchant");
              navigation.navigate("MerchantDashboard");
            })
          }
        >
          <Ionicons name="storefront" size={18} color="#B8B3A6" />
          <Text style={styles.rowLabelMuted}>Switch to merchant view</Text>
        </Pressable>

        <Pressable style={[styles.row, { marginBottom: spacing.xl }]} onPress={() => run(logout)}>
          <Ionicons name="log-out-outline" size={18} color={colors.chili} />
          <Text style={[styles.rowLabel, { color: colors.chili }]}>Log out</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: "rgba(0,0,0,0.5)" },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingBottom: spacing.xl },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.turmeric,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 17 },
  name: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 16 },
  sub: { color: "#B8B3A6", fontFamily: fonts.serif, fontSize: 12.5, marginTop: 2 },
  section: { gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 11 },
  rowLabel: { color: colors.white, fontFamily: fonts.display, fontSize: 14.5 },
  rowLabelMuted: { color: "#C9C4B6", fontFamily: fonts.serif, fontSize: 14 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: spacing.md },
});
