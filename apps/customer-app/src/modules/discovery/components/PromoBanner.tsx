import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, layout, radius, spacing } from "../../../shared/theme/theme";
import DishImage from "../../../shared/components/DishImage";
import PressableScale from "../../../shared/motion/PressableScale";

// "How it works" card on Home: explains the order-first, pay-after-the-stall-confirms flow.
// "Browse stalls" scrolls to the stall list. Ink card so the turmeric stays free for the screen's real actions.
export default function PromoBanner({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <View style={styles.card} accessible={!onBrowse} accessibilityLabel="Order first. Pay only after the stall says yes.">
      <View style={styles.text}>
        <Text style={styles.title}>Order first.{"\n"}Pay only when the stall says yes.</Text>
        <Text style={styles.sub}>Nothing is charged for a request the stall turns down.</Text>
        {onBrowse ? (
          <PressableScale style={styles.button} onPress={onBrowse} accessibilityRole="button" testID="browse-stalls">
            <Text style={styles.buttonText}>Browse stalls</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.ink} />
          </PressableScale>
        ) : null}
      </View>
      <DishImage image="/media/dishes/d1.jpg" size={88} shape="circle" tint={colors.paperDim} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.lg, backgroundColor: colors.ink, borderRadius: radius.lg, marginHorizontal: layout.gutter, marginTop: spacing.xl, padding: spacing.xl, paddingRight: spacing.lg, overflow: "hidden" },
  text: { flex: 1, minWidth: 0, gap: spacing.sm },
  title: { ...font.displayExtraBold, fontSize: 19, lineHeight: 24, color: colors.white, letterSpacing: -0.3 },
  sub: { ...font.serif, fontSize: 14, lineHeight: 19, color: colors.stoneSoft },
  button: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.paper, marginTop: spacing.xs },
  buttonText: { ...font.displayBold, fontSize: 14, color: colors.ink },
});
