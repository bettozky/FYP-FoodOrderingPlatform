import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, Switch } from "react-native";
import { merchantMenu, Dish } from "../../data/mockData";
import ScreenHeader from "../../components/ScreenHeader";
import { colors, radius, spacing, type } from "../../theme/theme";

export default function MerchantMenuScreen() {
  const [menu, setMenu] = useState<Dish[]>(merchantMenu);

  const toggleSoldOut = (id: string) => {
    setMenu((prev) => prev.map((d) => (d.id === id ? { ...d, soldOut: !d.soldOut } : d)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Menu management" subtitle={`${menu.length} dishes`} />
      <FlatList
        data={menu}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.emoji}>{item.image}</Text>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{item.name}</Text>
              <Text style={type.bodyMuted}>RM {item.price.toFixed(2)}</Text>
            </View>
            <View style={styles.toggleCol}>
              <Text style={type.small}>{item.soldOut ? "Sold out" : "Available"}</Text>
              <Switch
                value={!item.soldOut}
                onValueChange={() => toggleSoldOut(item.id)}
                trackColor={{ false: colors.border, true: colors.primarySoft }}
                thumbColor={item.soldOut ? colors.textFaint : colors.primary}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 30 },
  toggleCol: { alignItems: "center", gap: 4 },
});
