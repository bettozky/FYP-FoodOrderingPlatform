import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, layout, radius, shadow, spacing } from "../theme/theme";

// The one bottom sheet: slides up over a dimmed page, with a grab handle, an optional title and close button,
// and room for the home indicator. Tap outside or press back to close. Content scrolls when it is tall.
type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Pinned under the content (e.g. "Clear all · Show 12 dishes"). */
  footer?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
};

export default function BottomSheet({ visible, onClose, title, children, footer, style, testID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, style]} testID={testID} accessibilityViewIsModal>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.head}>
              <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={18} color={colors.ink} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} style={{ flexGrow: 0 }}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Pinned to all four edges (flex: 1 alone does not fill a Modal on web), so the dimmed backdrop covers the page.
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  sheet: { maxHeight: "88%", backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.sm, ...shadow.sheet },
  handle: { alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: colors.stoneSoft, marginBottom: spacing.md },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: layout.gutter, marginBottom: spacing.sm },
  title: { flex: 1, ...font.displayExtraBold, fontSize: 21, color: colors.ink, letterSpacing: -0.3 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.paperDim, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: layout.gutter, paddingBottom: spacing.sm, gap: spacing.sm },
  footer: { flexDirection: "row", gap: spacing.md, paddingHorizontal: layout.gutter, paddingTop: spacing.md },
});
