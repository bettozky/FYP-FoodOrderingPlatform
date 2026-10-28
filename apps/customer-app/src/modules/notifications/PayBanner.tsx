import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navRef } from "../../navigation/navRef";
import { rm, mmss, useCountdown } from "../../shared/util/format";
import { colors, fonts, radius, shadow, spacing } from "../../shared/theme/theme";
import { usePayableOrders } from "../ordering/payments";

// "Ah Seng confirmed #SM-10252 · Pay RM12.00 · 9:42 left": a small banner at the top, on any screen except the
// order's own screens. Tap it to pay; swipe it up (or tap x) to hide it. The Pay bar on Home and Orders stays until
// the time runs out. This replaces the old "Pay now / Later" pop-up.
function useCurrentRoute() {
  const [route, setRoute] = useState<{ name?: string; orderId?: string }>({});
  useEffect(() => {
    const update = () => {
      const r = navRef.isReady() ? navRef.getCurrentRoute() : undefined;
      setRoute((prev) => (prev.name === r?.name && prev.orderId === (r?.params as any)?.orderId ? prev : { name: r?.name, orderId: (r?.params as any)?.orderId }));
    };
    update();
    const unsub = navRef.addListener("state", update);
    const t = setInterval(update, 1000); // covers the moment before the navigator is ready
    return () => { unsub(); clearInterval(t); };
  }, []);
  return route;
}

function Body({ orderId, merchant, total, payBy }: { orderId: string; merchant: string; total: number; payBy?: number }) {
  const s = useCountdown(payBy);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.title} numberOfLines={1}>{merchant} confirmed #{orderId}</Text>
      <Text style={[styles.sub, s < 60 && { color: colors.chiliSoft }]}>Pay {rm(total)} · {mmss(s)} left</Text>
    </View>
  );
}

export default function PayBanner() {
  const payable = usePayableOrders();
  const route = useCurrentRoute();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const y = useRef(new Animated.Value(-140)).current;

  const order = payable.find((o) => !dismissed.includes(o.id) && !(route.orderId === o.id && (route.name === "OrderTracking" || route.name === "Pay")));
  const shownId = order?.id;
  const last = useRef(order);
  if (order) last.current = order;
  const shown = order ?? last.current;

  useEffect(() => {
    Animated.timing(y, { toValue: shownId ? 0 : -140, duration: 220, useNativeDriver: true }).start();
  }, [shownId, y]);

  const hide = () => { if (shown) setDismissed((p) => [...p, shown.id]); };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => { if (g.dy < 0) y.setValue(g.dy); },
        onPanResponderRelease: (_e, g) => {
          if (g.dy < -24 || g.vy < -0.5) hide();
          else Animated.timing(y, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown?.id],
  );

  if (!shown) return null;
  return (
    <Animated.View
      pointerEvents={shownId ? "auto" : "none"}
      style={[styles.wrap, { top: insets.top + spacing.sm, transform: [{ translateY: y }] }]}
      {...pan.panHandlers}
    >
      <Pressable
        style={styles.card}
        onPress={() => { if (navRef.isReady()) navRef.navigate("Pay", { orderId: shown.id }); }}
        accessibilityRole="button"
        accessibilityLabel={`${shown.merchantName} confirmed order ${shown.id}. Pay ${rm(shown.total)}.`}
        testID="pay-banner"
      >
        <View style={styles.icon}><Ionicons name="checkmark" size={18} color={colors.white} /></View>
        <Body orderId={shown.id} merchant={shown.merchantName} total={shown.total} payBy={shown.payBy} />
        <View style={styles.cta}><Text style={styles.ctaText}>Pay</Text></View>
        <Pressable onPress={hide} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide this banner" testID="pay-banner-hide">
          <Ionicons name="close" size={18} color={colors.stoneSoft} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.md, right: spacing.md, zIndex: 900, elevation: 900 },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, ...shadow.sheet },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.herb, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.white },
  sub: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.stoneSoft },
  cta: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: fonts.displayExtraBold, fontSize: 13, color: colors.ink },
});
