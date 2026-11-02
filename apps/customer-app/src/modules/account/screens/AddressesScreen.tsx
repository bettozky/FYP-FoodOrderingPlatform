import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { errorText } from "../../../shared/api/client";
import { confirmAsync } from "../../../shared/util/confirm";
import { Address, useCatalog } from "../../discovery/CatalogContext";

// "Addresses": the customer's own saved addresses (kept on the server) plus the places where ScootMeal shops are.
// Whatever is picked here is the address used on Home (distances) and Checkout (delivery).
// A saved address needs a map position, so the form asks the customer to pin it near a known place (no GPS needed).
type Draft = { id?: string; label: string; line: string; note: string; pin: Address | null; isDefault: boolean };
const EMPTY: Draft = { label: "", line: "", note: "", pin: null, isDefault: false };

export default function AddressesScreen() {
  const { saved, places, address, setAddress, saveAddress, updateAddress, deleteAddress } = useCatalog();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startNew = () => { setError(""); setDraft({ ...EMPTY, pin: places.find((p) => p.line === address.line) ?? places[0] ?? null, isDefault: saved.length === 0 }); };
  const startEdit = (a: Address) => {
    setError("");
    setDraft({ id: a.id, label: a.label, line: a.line, note: a.note ?? "", pin: { label: a.label, line: a.line, lat: a.lat, lng: a.lng }, isDefault: !!a.isDefault });
  };

  const submit = async () => {
    if (!draft) return;
    if (!draft.label.trim()) return setError("Give it a short name, e.g. Hostel.");
    if (!draft.line.trim()) return setError("Type the address, e.g. Block C, Room 2-14.");
    if (!draft.pin) return setError("Pick the place it is closest to.");
    setBusy(true);
    setError("");
    try {
      const body = { label: draft.label.trim(), line: draft.line.trim(), note: draft.note.trim(), lat: draft.pin.lat, lng: draft.pin.lng, isDefault: draft.isDefault };
      if (draft.id) await updateAddress(draft.id, body);
      else setAddress(await saveAddress(body));
      setDraft(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: Address) => {
    if (!a.id || !(await confirmAsync("Delete address?", `${a.label} will be removed from your saved addresses.`, "Delete"))) return;
    try { await deleteAddress(a.id); } catch (e) { setError(errorText(e)); }
  };

  const row = (a: Address, mine: boolean) => {
    const on = mine ? a.id === address.id : !address.id && a.line === address.line;
    return (
      <View key={a.id ?? a.line} style={[styles.row, on && styles.rowOn]}>
        <Pressable
          onPress={() => setAddress(a)}
          style={styles.rowMain}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
          accessibilityLabel={`${a.label}, ${a.line}${on ? ", selected" : ""}`}
          testID={`address-${a.label}`}
        >
          <Ionicons name={mine ? "home" : "location"} size={18} color={on ? colors.turmericDeep : colors.stone} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={type.h3}>{a.label}{a.isDefault ? "  ·  Default" : ""}</Text>
            <Text style={type.bodyMuted}>{a.line}</Text>
            {a.note ? <Text style={type.small}>{a.note}</Text> : null}
          </View>
          {on ? (
            <View style={styles.selected}>
              <Ionicons name="checkmark" size={14} color={colors.herb} />
              <Text style={styles.selectedText}>Selected</Text>
            </View>
          ) : null}
        </Pressable>
        {mine ? (
          <View style={styles.actions}>
            <Pressable onPress={() => startEdit(a)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${a.label}`} testID={`edit-address-${a.label}`}>
              <Ionicons name="create-outline" size={20} color={colors.stone} />
            </Pressable>
            <Pressable onPress={() => remove(a)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${a.label}`} testID={`delete-address-${a.label}`}>
              <Ionicons name="trash-outline" size={20} color={colors.danger ?? colors.stone} />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Addresses" subtitle="Save the places you order to. Distances are measured from the one you pick." />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.section}>My addresses</Text>
        {saved.length === 0 && !draft ? <Text style={type.bodyMuted}>You have not saved any address yet.</Text> : null}
        {saved.map((a) => row(a, true))}

        {draft ? (
          <View style={styles.form}>
            <Text style={type.h3}>{draft.id ? "Edit address" : "New address"}</Text>
            <TextInput style={styles.input} value={draft.label} onChangeText={(t) => setDraft({ ...draft, label: t })} placeholder="Name (e.g. Hostel, Office)" placeholderTextColor={colors.textFaint} maxLength={40} testID="address-label" />
            <TextInput style={styles.input} value={draft.line} onChangeText={(t) => setDraft({ ...draft, line: t })} placeholder="Address (e.g. Block C, Room 2-14)" placeholderTextColor={colors.textFaint} maxLength={200} testID="address-line" />
            <TextInput style={styles.input} value={draft.note} onChangeText={(t) => setDraft({ ...draft, note: t })} placeholder="Note for the rider (optional)" placeholderTextColor={colors.textFaint} maxLength={200} />
            <Text style={type.bodyMuted}>Closest place (used for distance and delivery):</Text>
            <View style={styles.chips}>
              {places.map((p) => {
                const on = draft.pin?.line === p.line;
                return (
                  <Pressable key={p.line} onPress={() => setDraft({ ...draft, pin: p })} style={[styles.chip, on && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <Text style={[styles.chipText, on && { color: colors.ink }]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setDraft({ ...draft, isDefault: !draft.isDefault })} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: draft.isDefault }}>
              <Ionicons name={draft.isDefault ? "checkbox" : "square-outline"} size={20} color={colors.turmericDeep} />
              <Text style={type.body}>Make this my default address</Text>
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.buttons}>
              <Pressable onPress={() => setDraft(null)} style={[styles.btn, styles.btnGhost]} disabled={busy}><Text style={styles.btnGhostText}>Cancel</Text></Pressable>
              <Pressable onPress={submit} style={[styles.btn, styles.btnMain]} disabled={busy} testID="save-address">
                {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.btnMainText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable onPress={startNew} style={styles.add} accessibilityRole="button" testID="add-address">
              <Ionicons name="add-circle-outline" size={20} color={colors.ink} />
              <Text style={styles.addText}>Add an address</Text>
            </Pressable>
          </>
        )}

        <Text style={[styles.section, { marginTop: spacing.lg }]}>Places with ScootMeal shops</Text>
        {places.length === 0 ? <Text style={type.bodyMuted}>Places appear here once shops are open on ScootMeal.</Text> : null}
        {places.map((a) => row(a, false))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 3 },
  section: { fontFamily: fonts.displayBold, fontSize: 13, letterSpacing: 0.4, color: colors.stone, textTransform: "uppercase", marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md },
  selected: { flexDirection: "row", alignItems: "center", gap: 4 },
  selectedText: { color: colors.herb, fontSize: 12, fontFamily: fonts.displayBold },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border },
  addText: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
  form: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, color: colors.ink, backgroundColor: colors.bg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, minHeight: 36, justifyContent: "center", borderRadius: radius.pill ?? 999, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.turmeric, borderColor: colors.turmeric },
  chipText: { fontSize: 13, color: colors.stone, fontFamily: fonts.displayBold },
  check: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 36 },
  error: { color: colors.danger ?? "#B3261E", fontSize: 13 },
  buttons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  btn: { flex: 1, minHeight: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostText: { fontFamily: fonts.displayBold, color: colors.ink },
  btnMain: { backgroundColor: colors.turmeric },
  btnMainText: { fontFamily: fonts.displayBold, color: colors.ink },
});
