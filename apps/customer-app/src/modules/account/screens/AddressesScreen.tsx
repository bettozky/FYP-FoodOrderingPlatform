import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import EmptyState from "../../../shared/components/EmptyState";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { useCatalog } from "../../discovery/CatalogContext";

// "Addresses": the places where ScootMeal shops are (built from real shop locations in CatalogContext).
// It shares the selected place with the Home and Checkout pickers, so changing it here changes it everywhere.
export default function AddressesScreen() {
  const { addresses, address, setAddress } = useCatalog();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Addresses" subtitle="Places with ScootMeal shops. Distances are measured from the one you pick." />
      <ScrollView contentContainerStyle={styles.wrap}>
        {addresses.length === 0 ? <EmptyState icon="location-outline" title="No places yet" hint="Places appear here once shops are open on ScootMeal." /> : null}
        {addresses.map((a) => {
          const on = a.line === address.line;
          return (
            <Pressable
              key={a.line}
              onPress={() => setAddress(a)}
              style={[styles.row, on && styles.rowOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${a.label}, ${a.line}${on ? ", selected" : ""}`}
              testID={`address-${a.label}`}
            >
              <Ionicons name="location" size={18} color={on ? colors.turmericDeep : colors.stone} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={type.h3}>{a.label}</Text>
                <Text style={type.bodyMuted}>{a.line}</Text>
              </View>
              {on ? (
                <View style={styles.selected}>
                  <Ionicons name="checkmark" size={14} color={colors.herb} />
                  <Text style={styles.selectedText}>Selected</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  selected: { flexDirection: "row", alignItems: "center", gap: 4 },
  selectedText: { color: colors.herb, fontSize: 12, fontFamily: fonts.displayBold },
});
