import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../shared/components/ScreenHeader";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { errorText } from "../../shared/api/client";
import { PopOnChange } from "../../shared/motion/PulseRing";
import { colors, fonts, radius, spacing, type, ui } from "../../shared/theme/theme";
import { ALLERGENS, DIET_PREFS, EMPTY_DIET, type DietProfile } from "./diet";
import { useDiet } from "./useDiet";

// Sprint 3 "diet and allergy profile". Route: navigation.navigate("Diet") (Account → Diet & allergies).
// Save allergies and diet once; stall menus then flag dishes that do not fit (red), dishes to check with the
// stall (amber), or hide the ones that do not fit.
export default function DietScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { diet, save } = useDiet();
  const [draft, setDraft] = useState<DietProfile>(diet ?? EMPTY_DIET);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (diet) setDraft(diet);
  }, [diet]);

  const toggle = (list: "allergens" | "prefs", key: string) =>
    setDraft((d) => ({ ...d, [list]: d[list].includes(key) ? d[list].filter((x) => x !== key) : [...d[list], key] }));

  async function onSave() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await save(draft);
      setMsg("Saved. Stall menus now flag dishes that don't fit.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const count = draft.allergens.length + draft.prefs.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Diet & allergies" subtitle="Set it once, we'll check every menu" />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <View style={styles.hero}>
          <PopOnChange trigger={count}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={26} color={colors.herb} />
            </View>
          </PopOnChange>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>{count ? `${count} ${count === 1 ? "thing" : "things"} to watch for` : "Nothing set yet"}</Text>
            <Text style={type.small}>Dishes that don't fit get a red label. Amber means the stall's kitchen uses one of your allergens, so ask first.</Text>
          </View>
        </View>

        <Text style={styles.section}>I'm allergic to</Text>
        <View style={styles.chips}>
          {ALLERGENS.map((a) => {
            const on = draft.allergens.includes(a);
            return (
              <Pressable key={a} onPress={() => toggle("allergens", a)} style={[ui.chip, on && styles.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`diet-allergen-${a}`}>
                {on ? <Ionicons name="close-circle" size={14} color={colors.white} /> : null}
                <Text style={[ui.chipText, on && { color: colors.white }]}>{a}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>My diet</Text>
        <View style={{ gap: spacing.sm }}>
          {DIET_PREFS.map((p) => {
            const on = draft.prefs.includes(p.key);
            return (
              <Pressable key={p.key} onPress={() => toggle("prefs", p.key)} style={[styles.prefRow, on && styles.prefRowOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} testID={`diet-pref-${p.key}`}>
                <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? colors.herb : colors.stone} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontFamily: fonts.displayBold }]}>{p.label}</Text>
                  <Text style={type.small}>{p.hint}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.prefRow, { marginTop: spacing.lg }]}>
          <Ionicons name="eye-off-outline" size={22} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { fontFamily: fonts.displayBold }]}>Hide dishes that don't fit</Text>
            <Text style={type.small}>Off: show them with a red label instead</Text>
          </View>
          <Switch
            value={draft.hideUnsuitable}
            onValueChange={(v) => setDraft((d) => ({ ...d, hideUnsuitable: v }))}
            trackColor={{ true: colors.herb, false: colors.stoneLine }}
            accessibilityLabel="Hide dishes that don't fit"
            testID="diet-hide"
          />
        </View>

        <Text style={styles.note}>Allergen labels come from the stalls. If your allergy is serious, always check with the stall before you eat.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {msg ? (
          <View style={styles.saved} testID="diet-saved">
            <Ionicons name="checkmark-circle" size={18} color={colors.herb} />
            <Text style={[type.small, { color: colors.herb, flex: 1 }]}>{msg}</Text>
          </View>
        ) : null}
        <PrimaryButton label="Save" onPress={onSave} loading={busy} testID="diet-save" />
        {msg ? <PrimaryButton label="Done" variant="outline" onPress={() => navigation.goBack()} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  hero: { flexDirection: "row", gap: spacing.md, alignItems: "center", backgroundColor: colors.herbLight, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.herbBorder },
  heroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  section: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.stoneText, textTransform: "uppercase", letterSpacing: 0.8, marginTop: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chipOn: { backgroundColor: colors.chili, borderColor: colors.chili, flexDirection: "row", alignItems: "center", gap: 4 },
  prefRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  prefRowOn: { borderColor: colors.herb, backgroundColor: colors.herbLight },
  note: { ...type.small, marginTop: spacing.sm },
  error: { fontFamily: fonts.displayBold, color: colors.chili },
  saved: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
});
