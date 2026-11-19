import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, spacing, type, ui } from "../theme/theme";

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  /** Large title (top-level screens) instead of the compact title used on pushed screens. */
  large?: boolean;
};

export default function ScreenHeader({ title, subtitle, showBack = true, right, large = false }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const canGoBack = showBack && navigation.canGoBack();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.left}>
        {canGoBack && (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            testID="back"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} style={{ marginLeft: -2 }} />
          </Pressable>
        )}
        {/* flex:1 + minWidth:0 lets a long title/subtitle wrap inside the screen width */}
        <View style={styles.titleCol}>
          <Text style={large && !canGoBack ? type.h1 : type.h2} accessibilityRole="header" numberOfLines={2}>{title}</Text>
          {subtitle ? <Text style={[type.bodyMuted, { marginTop: 2 }]} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1, minWidth: 0 },
  titleCol: { flex: 1, minWidth: 0 },
  right: { flexShrink: 0, marginLeft: spacing.sm },
  backBtn: { ...ui.iconButton },
});
