import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, spacing, ui } from "../../../shared/theme/theme";
import DishImage from "../../../shared/components/DishImage";

// Amber "How it works" card under the search bar on Home (Badrul's mock-up, Oct 2026).
// It explains the order-first, pay-after-the-stall-confirms flow; "Browse stalls" scrolls to the stall list.
// Vouchers moved to the cart ("Apply a voucher"), so this card no longer shows one.
export default function PromoBanner({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <View style={styles.card} accessible={!onBrowse} accessibilityLabel="How it works: order first. Pay only after the stall says yes.">
      <View style={styles.text}>
        <Text style={styles.kicker}>HOW IT WORKS</Text>
        <Text style={styles.title}>Order first. Pay only after the stall says yes.</Text>
        {onBrowse ? (
          <Pressable style={[ui.buttonDark, styles.button]} onPress={onBrowse} accessibilityRole="button" testID="browse-stalls">
            <Text style={[ui.buttonDarkText, { fontSize: 12.5 }]}>Browse stalls</Text>
          </Pressable>
        ) : null}
      </View>
      <DishImage image="🍜" size={64} shape="circle" tint={colors.paper} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.turmeric, borderRadius: radius.lg, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg },
  text: { flex: 1, minWidth: 0, gap: 6 },
  kicker: { fontFamily: fonts.displayBold, fontSize: 10.5, letterSpacing: 0.6, color: colors.ink },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 17, lineHeight: 22, color: colors.ink },
  button: { alignSelf: "flex-start", minHeight: 36, paddingHorizontal: spacing.md, marginTop: spacing.xs },
});
