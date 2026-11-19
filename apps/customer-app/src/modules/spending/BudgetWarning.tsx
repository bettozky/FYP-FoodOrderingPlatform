import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { rm } from "../../shared/util/format";
import { colors, radius, spacing, font } from "../../shared/theme/theme";
import { useLive } from "../ordering/LiveDataContext";
import { budgetState, spendingSummary } from "./spending";
import { useBudget } from "./useBudget";

// Sprint 3 weekly budget, shown at checkout: amber when this order uses 80% or more of the week's budget,
// red when it goes over. Nothing when there is no budget or plenty is left. It only warns; the order can still go ahead.
export default function BudgetWarning({ adding }: { adding: number }) {
  const navigation = useNavigation<any>();
  const { orders } = useLive();
  const { budget } = useBudget();
  const week = useMemo(() => spendingSummary(orders).thisWeek, [orders]);
  const st = budgetState(week, budget, adding);
  if (st.level === "none" || st.level === "ok") return null;
  const over = st.level === "over";
  return (
    <View style={[styles.box, over ? styles.over : styles.near]} testID="budget-warning" accessibilityRole="alert">
      <Ionicons name={over ? "alert-circle" : "wallet-outline"} size={18} color={over ? colors.chiliText : colors.amberText} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: over ? colors.chiliText : colors.amberText }]}>
          {over ? `This order puts you ${rm(-st.left)} over your weekly budget` : `This order uses ${st.percent}% of your weekly budget`}
        </Text>
        <Text style={styles.text}>
          {rm(week)} spent this week + {rm(adding)} now, budget {rm(budget!)}. You can still place the order.
        </Text>
      </View>
      <Pressable onPress={() => navigation.navigate("Spending")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open spending and budget">
        <Text style={styles.link}>View</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, borderWidth: 1 },
  near: { backgroundColor: colors.amberTint, borderColor: colors.amberBorder },
  over: { backgroundColor: colors.chiliSoft, borderColor: colors.chiliBorder },
  title: { ...font.displayBold, fontSize: 13 },
  text: { ...font.display, fontSize: 12, lineHeight: 16, color: colors.stoneText },
  link: { ...font.displayBold, fontSize: 13, color: colors.ink, textDecorationLine: "underline" },
});
