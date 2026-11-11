import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import PinMap from "../../../shared/location/PinMap";
import { api, errorText } from "../../../shared/api/client";
import { colors, fonts, radius, spacing, type, ui } from "../../../shared/theme/theme";
import { useCatalog } from "../CatalogContext";
import type { Address } from "../places";

type Point = { lat: number; lng: number };
type Result = { id: string; title: string; line: string; lat: number; lng: number; distance?: number };

// Where the map opens when the customer has no address yet (the campus area in Kuching).
const KUCHING: Point = { lat: 1.5535, lng: 110.3593 };
const LABELS = ["Home", "Hostel", "Work", "Other"];

const metres = (a: Point, b: Point) => Math.hypot((a.lat - b.lat) * 111000, (a.lng - b.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180));

/**
 * Grab-style delivery address picker. The customer moves the map under a fixed pin (or searches, or uses their current
 * location), the app suggests the street address for that pin, and the customer can edit the address and add a room /
 * note before confirming. The arrow beside the address opens a dropdown of saved addresses, addresses near the pin and
 * campus places. A new address can be saved for next time.
 */
export default function AddressPicker({ visible, initial, onClose, onConfirm }: {
  visible: boolean;
  initial?: Address | null;
  onClose: () => void;
  onConfirm: (a: Address) => void;
}) {
  const insets = useSafeAreaInsets();
  const { saved, places, saveAddress, updateAddress, deleteAddress } = useCatalog();

  const [center, setCenter] = useState<Point>(KUCHING);
  const [focus, setFocus] = useState({ ...KUCHING, key: 0 });
  const [line, setLine] = useState("");
  const [resolving, setResolving] = useState(false);
  const [approx, setApprox] = useState(false);
  const [note, setNote] = useState("");
  const [label, setLabel] = useState("Home");
  const [saveIt, setSaveIt] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteArm, setDeleteArm] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nearby, setNearby] = useState<Result[]>([]);
  const [nearbyBusy, setNearbyBusy] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const nearbyFor = useRef<Point | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The pin position whose address is already known (a saved address, a search result): moving the map a few metres
  // (for example the map settling after we moved it) must not replace that address with a new lookup.
  const knownRef = useRef<Point | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseSeq = useRef(0);

  const suggest = useCallback((p: Point) => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    setResolving(true);
    reverseTimer.current = setTimeout(async () => {
      const seq = ++reverseSeq.current;
      try {
        const r = await api<{ line: string; approximate: boolean }>("GET", `/geo/reverse?lat=${p.lat}&lng=${p.lng}`);
        if (seq !== reverseSeq.current) return;
        setLine(r.line);
        setApprox(r.approximate);
      } catch {
        if (seq !== reverseSeq.current) return;
        setLine(`Pinned location (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)})`);
        setApprox(true);
      } finally {
        if (seq === reverseSeq.current) setResolving(false);
      }
    }, 600);
  }, []);

  /** Move the map. With a line, that address is used as it is; without one, the address for the new spot is looked up. */
  const goTo = useCallback((p: Point, known?: string) => {
    setCenter(p);
    setFocus((f) => ({ ...p, key: f.key + 1 }));
    if (known !== undefined) {
      knownRef.current = p;
      reverseSeq.current++;
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
      setResolving(false);
      setLine(known);
      setApprox(false);
    } else {
      knownRef.current = null;
      suggest(p);
    }
  }, [suggest]);

  const onMapMove = useCallback((lat: number, lng: number) => {
    const p = { lat, lng };
    setCenter(p);
    const k = knownRef.current;
    if (k && metres(k, p) < 15) return;
    knownRef.current = null;
    setSelectedId(null);
    suggest(p);
  }, [suggest]);

  // Reset every time the picker opens.
  useEffect(() => {
    if (!visible) return;
    const start = initial && Number.isFinite(initial.lat) ? { lat: initial.lat, lng: initial.lng } : KUCHING;
    const known = initial && (initial.id || initial.pinned) && initial.line ? initial.line : undefined;
    setCenter(start);
    setFocus((f) => ({ ...start, key: f.key + 1 }));
    setNote(initial?.note ?? "");
    setLabel(initial?.id ? initial.label : "Home");
    setSelectedId(initial?.id ?? null);
    setSaveIt(false);
    setDeleteArm(null);
    setMenuOpen(false);
    setNearby([]);
    setNearbyError("");
    nearbyFor.current = null;
    setQuery("");
    setResults([]);
    setSearchError("");
    setError("");
    if (known) { knownRef.current = start; setLine(known); setApprox(false); setResolving(false); }
    else { knownRef.current = null; setLine(""); suggest(start); }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search as the customer types.
  useEffect(() => {
    const q = query.trim();
    setSearchError("");
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const r = await api<{ results: Result[] }>("GET", `/geo/search?q=${encodeURIComponent(q)}&lat=${center.lat}&lng=${center.lng}`);
        if (alive) setResults(r.results);
      } catch (e) {
        if (alive) { setResults([]); setSearchError(errorText(e)); }
      } finally {
        if (alive) setSearching(false);
      }
    }, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function locateMe() {
    setError("");
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") throw new Error("Allow location access in your browser or phone settings, then try again.");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setSelectedId(null);
      setResults([]);
      setQuery("");
      goTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLocating(false);
    }
  }

  function pickSaved(a: Address) {
    setSelectedId(a.id ?? null);
    setLabel(a.label);
    setNote(a.note ?? "");
    setSaveIt(false);
    setDeleteArm(null);
    setMenuOpen(false);
    goTo({ lat: a.lat, lng: a.lng }, a.line);
  }
  function pickPlace(a: Address) {
    setSelectedId(null);
    setLabel("Home");
    setNote("");
    setSaveIt(false);
    setMenuOpen(false);
    goTo({ lat: a.lat, lng: a.lng }, a.line);
  }
  function pickNearby(r: Result) {
    setSelectedId(null);
    setSaveIt(false);
    setMenuOpen(false);
    goTo({ lat: r.lat, lng: r.lng }, r.line);
  }

  /** Open or close the address dropdown. Opening it looks up addresses around the pin (again only if the pin has moved). */
  async function toggleMenu() {
    if (menuOpen) { setMenuOpen(false); return; }
    setMenuOpen(true);
    const here = { ...center };
    if (nearbyFor.current && metres(nearbyFor.current, here) < 40) return;
    nearbyFor.current = here;
    setNearbyBusy(true);
    setNearbyError("");
    try {
      const r = await api<{ results: Result[] }>("GET", `/geo/nearby?lat=${here.lat}&lng=${here.lng}`);
      if (nearbyFor.current === here) setNearby(r.results);
    } catch (e) {
      if (nearbyFor.current === here) { setNearby([]); setNearbyError(errorText(e)); nearbyFor.current = null; }
    } finally {
      if (nearbyFor.current === here || nearbyFor.current === null) setNearbyBusy(false);
    }
  }
  function pickResult(r: Result) {
    setSelectedId(null);
    setResults([]);
    setQuery("");
    goTo({ lat: r.lat, lng: r.lng }, r.line || r.title);
  }

  async function removeSaved(id: string) {
    if (deleteArm !== id) { setDeleteArm(id); return; }
    try {
      await deleteAddress(id);
      if (selectedId === id) setSelectedId(null);
      setDeleteArm(null);
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function confirm() {
    const text = line.trim();
    if (!text) { setError("Enter the address, or move the pin so we can suggest one."); return; }
    const spot = { lat: Number(center.lat.toFixed(6)), lng: Number(center.lng.toFixed(6)) };
    const cleanNote = note.trim() || undefined;
    setBusy(true);
    setError("");
    try {
      const existing = selectedId ? saved.find((s) => s.id === selectedId) : undefined;
      if (saveIt) {
        const body = { label: label || "Home", line: text, ...spot, note: cleanNote };
        if (existing) {
          await updateAddress(existing.id!, body);
          onConfirm({ ...existing, ...body, pinned: true });
        } else {
          const a = await saveAddress(body);
          onConfirm({ ...a, pinned: true });
        }
      } else if (existing && metres(existing, spot) < 15 && existing.line === text && (existing.note ?? "") === (cleanNote ?? "")) {
        onConfirm(existing); // a saved address, unchanged
      } else {
        onConfirm({ label: existing?.label ?? "Pinned location", line: text, ...spot, note: cleanNote, pinned: true });
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const existing = selectedId ? saved.find((s) => s.id === selectedId) : undefined;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]} testID="address-picker">
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" testID="picker-close" style={styles.closeBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Delivery location</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.stone} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search a place or street"
              placeholderTextColor={colors.textFaint}
              returnKeyType="search"
              testID="picker-search"
            />
            {searching ? <ActivityIndicator size="small" color={colors.stone} /> : query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color={colors.stone} /></Pressable>
            ) : null}
          </View>
          {results.length > 0 ? (
            <View style={styles.results} testID="picker-results">
              {results.map((r) => (
                <Pressable key={r.id} style={styles.resultRow} onPress={() => pickResult(r)} testID={`result-${r.id}`}>
                  <Ionicons name="location-outline" size={18} color={colors.stone} />
                  <View style={{ flex: 1 }}>
                    <Text style={type.body} numberOfLines={1}>{r.title}</Text>
                    <Text style={type.small} numberOfLines={1}>{r.line}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
          {searchError ? <Text style={[type.small, { color: colors.chiliText }]}>{searchError}</Text> : null}
          {!searching && !searchError && query.trim().length >= 2 && results.length === 0 ? <Text style={type.small}>No places found. Try another name, or move the pin.</Text> : null}

          <View>
            <PinMap lat={focus.lat} lng={focus.lng} focusKey={focus.key} onMove={onMapMove} />
            <Pressable style={styles.locateFab} onPress={locateMe} disabled={locating} accessibilityRole="button" accessibilityLabel="Use my current location" testID="picker-locate">
              {locating ? <ActivityIndicator size="small" color={colors.ink} /> : <Ionicons name="navigate" size={18} color={colors.ink} />}
              <Text style={styles.locateText}>{locating ? "Finding you…" : "My location"}</Text>
            </Pressable>
          </View>
          <Text style={type.small}>Move the map so the pin sits on your door or drop-off spot.</Text>

          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.field}>
            <Ionicons name="location" size={18} color={colors.turmericDeep} style={{ marginTop: 2 }} />
            <TextInput
              style={styles.fieldInput}
              value={line}
              onChangeText={(t) => { setLine(t); setApprox(false); }}
              placeholder={resolving ? "Finding the address…" : "Street, building or area"}
              placeholderTextColor={colors.textFaint}
              multiline
              testID="picker-address"
            />
            {resolving ? <ActivityIndicator size="small" color={colors.stone} /> : null}
            <Pressable onPress={toggleMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Saved and nearby addresses" accessibilityState={{ expanded: menuOpen }} testID="picker-dropdown" style={styles.caret}>
              <Ionicons name={menuOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.ink} />
            </Pressable>
          </View>
          {menuOpen ? (
            <View style={styles.menu} testID="picker-menu">
              {saved.length > 0 ? <Text style={styles.menuTitle}>Saved addresses</Text> : null}
              {saved.map((a) => (
                <View key={a.id} style={[styles.menuRow, selectedId === a.id && styles.menuRowOn]}>
                  <Pressable style={styles.menuMain} onPress={() => pickSaved(a)} testID={`saved-${a.id}`}>
                    <Ionicons name={a.label === "Home" ? "home" : a.label === "Work" ? "briefcase" : "bookmark"} size={16} color={colors.turmericDeep} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.body} numberOfLines={1}>{a.label}</Text>
                      <Text style={type.small} numberOfLines={1}>{a.line}</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => removeSaved(a.id!)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete saved address ${a.label}`} testID={`delete-${a.id}`}>
                    {deleteArm === a.id ? <Text style={[styles.linkText, { color: colors.chiliText }]}>Tap again</Text> : <Ionicons name="trash-outline" size={18} color={colors.stone} />}
                  </Pressable>
                </View>
              ))}

              <Text style={styles.menuTitle}>Near your pin</Text>
              {nearbyBusy ? (
                <View style={styles.menuNote}><ActivityIndicator size="small" color={colors.stone} /><Text style={type.small}>Finding addresses near your pin…</Text></View>
              ) : nearbyError ? (
                <Text style={[type.small, styles.menuNote, { color: colors.chiliText }]}>{nearbyError}</Text>
              ) : nearby.filter((r) => r.line !== line.trim()).length === 0 ? (
                <Text style={[type.small, styles.menuNote]}>No other addresses found here. Move the pin and try again.</Text>
              ) : nearby.filter((r) => r.line !== line.trim()).map((r) => (
                <Pressable key={r.id} style={styles.menuRow} onPress={() => pickNearby(r)} testID={`nearby-${r.id}`}>
                  <View style={styles.menuMain}>
                    <Ionicons name="location-outline" size={16} color={colors.stone} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.body} numberOfLines={1}>{r.title}</Text>
                      <Text style={type.small} numberOfLines={1}>{r.line}</Text>
                    </View>
                    {r.distance !== undefined ? <Text style={type.small}>{r.distance < 10 ? "here" : `${r.distance} m`}</Text> : null}
                  </View>
                </Pressable>
              ))}

              {places.length > 0 ? <Text style={styles.menuTitle}>Campus places</Text> : null}
              {places.map((p) => (
                <Pressable key={p.line} style={styles.menuRow} onPress={() => pickPlace(p)} testID={`place-${p.label}`}>
                  <View style={styles.menuMain}>
                    <Ionicons name="storefront" size={16} color={colors.stone} />
                    <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>{p.label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={type.small}>{approx ? "We could not find a street name for this spot. Type the address so the rider can find you." : "Suggested from your pin. You can edit it, or tap the arrow for saved and nearby addresses."}</Text>
          <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Room, floor or note for the rider (optional)" placeholderTextColor={colors.textFaint} testID="picker-note" />

          <Pressable style={styles.saveRow} onPress={() => setSaveIt((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: saveIt }} testID="picker-save">
            <View style={[styles.checkbox, saveIt && styles.checkboxOn]}>{saveIt ? <Ionicons name="checkmark" size={14} color={colors.ink} /> : null}</View>
            <Text style={[type.body, { flex: 1 }]}>{existing ? "Update this saved address" : "Save this address for next time"}</Text>
          </Pressable>
          {saveIt ? (
            <View style={styles.chipRow}>
              {LABELS.map((l) => (
                <Pressable key={l} style={[styles.chip, label === l && styles.chipOn]} onPress={() => setLabel(l)} testID={`label-${l}`}>
                  <Text style={styles.chipText}>{l}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {error ? <Text style={[type.small, { color: colors.chiliText }]} testID="picker-error">{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Pressable style={[ui.buttonAccent, (busy || resolving || !line.trim()) && { opacity: 0.6 }]} onPress={confirm} disabled={busy || resolving || !line.trim()} accessibilityRole="button" testID="picker-confirm">
            <Text style={ui.buttonAccentText}>{busy ? "Saving…" : resolving ? "Finding the address…" : "Confirm location"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink },
  body: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 140, gap: spacing.md },
  searchBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.paper, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, minHeight: 48 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: fonts.serif, color: colors.ink, paddingVertical: 10 },
  results: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  locateFab: { position: "absolute", right: spacing.md, bottom: spacing.md, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, zIndex: 1100 },
  locateText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  sectionTitle: { ...ui.sectionTitle },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.amberTint, borderColor: colors.turmeric },
  chipText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink },
  linkText: { fontFamily: fonts.displayBold, fontSize: 12.5, color: colors.ink, textDecorationLine: "underline" },
  field: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  caret: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  menu: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  menuTitle: { fontFamily: fonts.displayBold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.stone, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  menuRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, minHeight: 48, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  menuRowOn: { backgroundColor: colors.amberTint },
  menuMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, minWidth: 0 },
  menuNote: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  fieldInput: { flex: 1, minHeight: 40, fontSize: 15, fontFamily: fonts.serif, color: colors.ink, padding: 0 },
  input: { backgroundColor: colors.paper, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, fontFamily: fonts.serif, color: colors.ink, borderWidth: 1, borderColor: colors.border },
  saveRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 40 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxOn: { borderColor: colors.turmeric, backgroundColor: colors.turmeric },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.border },
});
