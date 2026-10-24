// The 8 sign-up sections (task plan section 7). Each step only draws fields; the wizard owns state and validation.
import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { Chips, Field, FieldError, Label, styles as f, ToggleRow, UploadTile } from "./fields";
import { canPickFiles } from "./pickFile";
import { ALLERGENS, BUSINESS_TYPES, DAYS, emptyMenuItem, ShopApplication } from "./types";
import type { Errors } from "./validate";

export type StepProps = {
  a: ShopApplication;
  set: (patch: Partial<ShopApplication>) => void;
  errors: Errors;
  goTo?: (step: number) => void;
};

// 1. Account
export function AccountStep({ a, set, errors }: StepProps) {
  return (
    <>
      <Field label="Owner's full name" value={a.ownerName} onChange={(v) => set({ ownerName: v })} error={errors.ownerName} placeholder="Name on your account" autoCapitalize="words" autoComplete="name" testID="reg-owner" />
      <Field label="Email address" value={a.email} onChange={(v) => set({ email: v })} error={errors.email} placeholder="you@restaurant.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" testID="reg-email" />
      <Field label="Phone number" value={a.phone} onChange={(v) => set({ phone: v })} error={errors.phone} placeholder="+60 12-345 6789" keyboardType="phone-pad" autoComplete="tel" hint="Customers may use this number to contact your shop." testID="reg-phone" />
      <Field label="Password (6+ characters)" value={a.password} onChange={(v) => set({ password: v })} error={errors.password} placeholder="Create a password" secureTextEntry autoComplete="new-password" testID="reg-password" />
      <Field label="Confirm password" value={a.passwordConfirm} onChange={(v) => set({ passwordConfirm: v })} error={errors.passwordConfirm} placeholder="Enter it again" secureTextEntry autoComplete="new-password" testID="reg-password-confirm" />
    </>
  );
}

// 2. Business
export function BusinessStep({ a, set, errors }: StepProps) {
  return (
    <>
      <Field label="Shop name" value={a.shopName} onChange={(v) => set({ shopName: v })} error={errors.shopName} placeholder="e.g. Kopitiam Lama" autoCapitalize="words" testID="reg-business" />
      <Chips label="Business type" options={BUSINESS_TYPES} value={a.businessType} onPick={(k) => set({ businessType: k })} error={errors.businessType} testID="reg-type" />
      <Field label="SSM registration number" value={a.ssmNumber} onChange={(v) => set({ ssmNumber: v })} error={errors.ssmNumber} placeholder="202301012345 or 1234567-A" autoCapitalize="characters" testID="reg-ssm" />
      <Field label="Short description" value={a.description} onChange={(v) => set({ description: v })} error={errors.description} placeholder="e.g. Wok-fried noodles and kopitiam drinks since 2009." multiline maxLength={160} hint={`${a.description.trim().length}/160`} testID="reg-description" />
      <UploadTile label="SSM certificate" kind="document" file={a.ssmCertificate} onChange={(x) => set({ ssmCertificate: x })} error={errors.ssmCertificate} privateNote testID="reg-ssm-file" />
    </>
  );
}

// 3. Location
export function LocationStep({ a, set, errors }: StepProps) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const geo: any = typeof navigator !== "undefined" ? (navigator as any).geolocation : undefined;

  function useMyLocation() {
    setLocError("");
    if (!geo) return setLocError("Location is not available here. Type the pin numbers below instead.");
    setLocating(true);
    geo.getCurrentPosition(
      (p: any) => { set({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }); setLocating(false); },
      () => { setLocError("Could not get your location. Allow location access, or type the pin numbers below."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const hasPin = !!a.lat.trim() && !!a.lng.trim();
  return (
    <>
      <Field label="Address or stall number" value={a.address} onChange={(v) => set({ address: v })} error={errors.address} placeholder="Canteen B, Stall 6" autoCapitalize="words" testID="reg-location" />
      <View style={f.block}>
        <Label>Map pin</Label>
        <View style={[s.pinCard, !!errors.pin && f.inputError]}>
          <Ionicons name="location" size={28} color={hasPin ? colors.turmericDeep : colors.stone} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={type.h3}>{hasPin ? "Pin set" : "No pin yet"}</Text>
            <Text style={type.small}>{hasPin ? `${a.lat}, ${a.lng}` : "Stand at your shop and tap the button, or type the numbers."}</Text>
          </View>
        </View>
        <Pressable style={s.ghostBtn} onPress={useMyLocation} disabled={locating} accessibilityRole="button" testID="reg-use-location">
          <Ionicons name="navigate-outline" size={16} color={colors.ink} />
          <Text style={s.ghostText}>{locating ? "Finding you…" : "Use my current location"}</Text>
        </Pressable>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="Latitude" value={a.lat} onChange={(v) => set({ lat: v })} placeholder="1.5533" keyboardType="numbers-and-punctuation" testID="reg-lat" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Longitude" value={a.lng} onChange={(v) => set({ lng: v })} placeholder="110.3592" keyboardType="numbers-and-punctuation" testID="reg-lng" />
          </View>
        </View>
        <Text style={type.small}>The pin shows your shop on the customer map.</Text>
        <FieldError text={errors.pin || locError} />
      </View>
      <Field label="Nearby landmark (optional)" value={a.landmark} onChange={(v) => set({ landmark: v })} placeholder="e.g. Next to the campus bookshop" testID="reg-landmark" />
    </>
  );
}

// 4. Food
export function FoodStep({ a, set, errors }: StepProps) {
  return (
    <>
      <Field label="Cuisine type" value={a.cuisine} onChange={(v) => set({ cuisine: v })} error={errors.cuisine} placeholder="Noodles, Malay, Drinks" autoCapitalize="words" hint="Separate several with commas." testID="reg-cuisine" />
      <Chips label="Price range" options={[{ key: 1, label: "RM" }, { key: 2, label: "RM RM" }, { key: 3, label: "RM RM RM" }]} value={a.priceRange} onPick={(k) => set({ priceRange: k as 1 | 2 | 3 })} error={errors.priceRange} testID="reg-price" />
      <ToggleRow label="Vegetarian or vegan options" sub="Shown as a tag on your shop page" value={a.vegetarianOptions} onChange={(v) => set({ vegetarianOptions: v })} testID="reg-veg" />
      <Chips label="Is your food halal?" options={[{ key: "yes", label: "Yes, halal" }, { key: "no", label: "No" }]} value={a.halal === null ? null : a.halal ? "yes" : "no"} onPick={(k) => set({ halal: k === "yes" })} error={errors.halal} testID="reg-halal" />
      {a.halal ? <UploadTile label="Halal certificate" kind="document" file={a.halalCertificate} onChange={(x) => set({ halalCertificate: x })} error={errors.halalCertificate} privateNote testID="reg-halal-file" /> : null}
    </>
  );
}

// 5. Hours and service
export function ServiceStep({ a, set, errors }: StepProps) {
  const setDay = (i: number, patch: Partial<ShopApplication["hours"][number]>) => set({ hours: a.hours.map((h, j) => (j === i ? { ...h, ...patch } : h)) });
  const copyMonday = () => set({ hours: a.hours.map((h) => ({ ...h, open: a.hours[0].open, close: a.hours[0].close, closed: a.hours[0].closed })) });
  return (
    <>
      <View style={f.block}>
        <View style={s.rowBetween}>
          <Label>Opening hours</Label>
          <Pressable onPress={copyMonday} hitSlop={8} accessibilityRole="button" testID="reg-copy-hours">
            <Text style={s.link}>Copy Monday to all days</Text>
          </Pressable>
        </View>
        <View style={[s.hoursCard, !!errors.hours && f.inputError]}>
          {a.hours.map((h, i) => (
            <View key={h.day} style={s.dayRow}>
              <Text style={[type.body, s.dayLabel]}>{DAYS[i].label.slice(0, 3)}</Text>
              {h.closed ? (
                <Text style={[type.bodyMuted, { flex: 1 }]}>Closed</Text>
              ) : (
                <View style={s.times}>
                  <TextInput style={s.time} value={h.open} onChangeText={(v: string) => setDay(i, { open: v })} placeholder="09:00" placeholderTextColor={colors.textFaint} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel={`${DAYS[i].label} opens`} testID={`reg-open-${h.day}`} />
                  <Text style={type.bodyMuted}>–</Text>
                  <TextInput style={s.time} value={h.close} onChangeText={(v: string) => setDay(i, { close: v })} placeholder="21:00" placeholderTextColor={colors.textFaint} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel={`${DAYS[i].label} closes`} testID={`reg-close-${h.day}`} />
                </View>
              )}
              <Switch value={!h.closed} onValueChange={(open: boolean) => setDay(i, { closed: !open })} trackColor={{ false: colors.stoneLine, true: colors.herb }} thumbColor={colors.white} accessibilityLabel={`Open on ${DAYS[i].label}`} />
            </View>
          ))}
        </View>
        <FieldError text={errors.hours} />
      </View>
      <View style={f.block}>
        <Label>How customers get their food</Label>
        <ToggleRow label="Delivery" value={a.delivery} onChange={(v) => set({ delivery: v })} testID="reg-delivery" />
        <ToggleRow label="Pickup" value={a.pickup} onChange={(v) => set({ pickup: v })} testID="reg-pickup" />
        <ToggleRow label="Dine-in" value={a.dineIn} onChange={(v) => set({ dineIn: v })} testID="reg-dinein" />
        <FieldError text={errors.service} />
      </View>
      {a.dineIn ? <Field label="Number of seats" value={a.seats} onChange={(v) => set({ seats: v })} error={errors.seats} placeholder="e.g. 12" keyboardType="number-pad" testID="reg-seats" /> : null}
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field label="Avg. prep time (min)" value={a.prepMinutes} onChange={(v) => set({ prepMinutes: v })} error={errors.prepMinutes} placeholder="15" keyboardType="number-pad" testID="reg-prep" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Minimum order (RM)" value={a.minOrder} onChange={(v) => set({ minOrder: v })} error={errors.minOrder} placeholder="Optional" keyboardType="decimal-pad" testID="reg-min-order" />
        </View>
      </View>
    </>
  );
}

// 6. Allergens and hygiene
export function HygieneStep({ a, set, errors }: StepProps) {
  const toggle = (k: string) => set({ allergens: a.allergens.includes(k) ? a.allergens.filter((x) => x !== k) : [...a.allergens, k] });
  return (
    <>
      <Chips label="Common allergens you use (tick all that apply)" options={ALLERGENS.map((k) => ({ key: k, label: k }))} selected={a.allergens} onPick={toggle} testID="reg-allergen" />
      {a.allergens.length === 0 ? <Text style={type.small}>Leave empty only if none of these are used in your kitchen.</Text> : null}
      <Field label="Food hygiene or business licence number" value={a.licenceNo} onChange={(v) => set({ licenceNo: v })} error={errors.licenceNo} placeholder="e.g. MBJB-LK-2024-08812" autoCapitalize="characters" testID="reg-licence" />
    </>
  );
}

// 7. Pictures
export function PicturesStep({ a, set, errors }: StepProps) {
  const setItem = (i: number, patch: Partial<ShopApplication["menuItems"][number]>) => set({ menuItems: a.menuItems.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return (
    <>
      <UploadTile label="Logo" kind="image" file={a.logo} onChange={(x) => set({ logo: x })} error={errors.logo} testID="reg-logo" />
      <UploadTile label="Cover photo" kind="image" file={a.cover} onChange={(x) => set({ cover: x })} error={errors.cover} testID="reg-cover" />
      <Label>Menu items (at least 3, each with a real photo)</Label>
      {a.menuItems.map((m, i) => (
        <View key={i} style={[s.dishCard, !!errors[`menu${i}`] && f.inputError]}>
          <View style={s.rowBetween}>
            <Text style={type.h3}>Dish {i + 1}</Text>
            {a.menuItems.length > 3 ? (
              <Pressable onPress={() => set({ menuItems: a.menuItems.filter((_, j) => j !== i) })} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove dish ${i + 1}`}>
                <Text style={s.link}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={s.row}>
            <View style={{ flex: 2 }}>
              <Field label="Name" value={m.name} onChange={(v) => setItem(i, { name: v })} placeholder="e.g. Kuey Teow Goreng" autoCapitalize="words" testID={`reg-dish-${i}-name`} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Price (RM)" value={m.price} onChange={(v) => setItem(i, { price: v })} placeholder="8.50" keyboardType="decimal-pad" testID={`reg-dish-${i}-price`} />
            </View>
          </View>
          <Field label="Description" value={m.description} onChange={(v) => setItem(i, { description: v })} placeholder="One short line" maxLength={120} testID={`reg-dish-${i}-desc`} />
          <UploadTile label="Dish photo" kind="image" file={m.photo} onChange={(x) => setItem(i, { photo: x })} testID={`reg-dish-${i}-photo`} />
          <FieldError text={errors[`menu${i}`]} />
        </View>
      ))}
      {a.menuItems.length < 10 ? (
        <Pressable style={s.ghostBtn} onPress={() => set({ menuItems: [...a.menuItems, emptyMenuItem()] })} accessibilityRole="button" testID="reg-add-dish">
          <Ionicons name="add" size={18} color={colors.ink} />
          <Text style={s.ghostText}>Add another dish</Text>
        </Pressable>
      ) : null}
      <FieldError text={errors.menu} />
      <Text style={type.small}>Use your own photos, taken with the owner's permission. Do not copy pictures from Google or GrabFood.</Text>
    </>
  );
}

// 8. Review and agree
const TYPE_LABEL = Object.fromEntries(BUSINESS_TYPES.map((b) => [b.key, b.label]));
export function ReviewStep({ a, set, errors, goTo }: StepProps) {
  const open = a.hours.filter((h) => !h.closed);
  const service = [a.delivery && "Delivery", a.pickup && "Pickup", a.dineIn && `Dine-in (${a.seats || "?"} seats)`].filter(Boolean).join(", ");
  const photos = [a.logo && "logo", a.cover && "cover", `${a.menuItems.filter((m) => m.photo).length} dish photos`].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["Account", `${a.ownerName.trim()} · ${a.email.trim()} · ${a.phone.trim()}`],
    ["Business", `${a.shopName.trim()} · ${a.businessType ? TYPE_LABEL[a.businessType] : ""} · SSM ${a.ssmNumber.trim()}${a.ssmCertificate ? " · certificate added" : ""}`],
    ["Location", `${a.address.trim()}${a.landmark.trim() ? ` · ${a.landmark.trim()}` : ""} · pin ${a.lat}, ${a.lng}`],
    ["Food", `${a.cuisine.trim()} · ${"RM ".repeat(a.priceRange ?? 0).trim()}${a.vegetarianOptions ? " · vegetarian options" : ""} · ${a.halal ? "Halal" : "Not halal"}`],
    ["Hours and service", `Open ${open.length} days (${open[0]?.open ?? ""}–${open[0]?.close ?? ""} on ${DAYS.find((d) => d.key === open[0]?.day)?.label ?? ""}) · ${service} · prep ${a.prepMinutes} min${a.minOrder.trim() ? ` · min RM ${a.minOrder.trim()}` : ""}`],
    ["Allergens and hygiene", `${a.allergens.length ? a.allergens.join(", ") : "None listed"} · licence ${a.licenceNo.trim()}`],
    ["Pictures", `${photos} · ${a.menuItems.length} dishes`],
  ];
  return (
    <>
      {rows.map(([title, value], i) => (
        <View key={title} style={s.reviewRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={type.h3}>{title}</Text>
            <Text style={type.small}>{value}</Text>
          </View>
          <Pressable onPress={() => goTo?.(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${title}`} testID={`reg-edit-${i}`}>
            <Text style={s.link}>Edit</Text>
          </Pressable>
        </View>
      ))}
      {!canPickFiles ? (
        <View style={s.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.amberText} />
          <Text style={[type.small, { flex: 1, color: colors.amberText }]}>Photos and certificates were not added on this device. The admin will ask you for them before approval.</Text>
        </View>
      ) : null}
      <Pressable style={s.agree} onPress={() => set({ agreedTerms: !a.agreedTerms })} accessibilityRole="checkbox" accessibilityState={{ checked: a.agreedTerms }} testID="reg-terms">
        <View style={[s.box, a.agreedTerms && s.boxOn]}>{a.agreedTerms ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}</View>
        <Text style={[type.body, { flex: 1 }]}>I agree to the ScootMeal merchant terms and confirm these details are true.</Text>
      </Pressable>
      <FieldError text={errors.agreedTerms} />
      <Text style={type.small}>We do not ask for IC numbers or bank details. Your shop goes live once a ScootMeal admin approves it.</Text>
    </>
  );
}

export const STEP_COMPONENTS = [AccountStep, BusinessStep, LocationStep, FoodStep, ServiceStep, HygieneStep, PicturesStep, ReviewStep];

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.amberText },
  pinCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.paperDim, borderWidth: 1, borderColor: colors.paperDim },
  ghostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.paper },
  ghostText: { fontFamily: fonts.display, fontSize: 14, color: colors.ink },
  hoursCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  dayRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48 },
  dayLabel: { width: 40, fontFamily: fonts.display },
  times: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  time: { width: 64, textAlign: "center", borderWidth: 1, borderColor: colors.stone, borderRadius: radius.sm, paddingVertical: 6, fontFamily: fonts.serifMedium, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  dishCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, borderRadius: radius.sm },
  note: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.amberTint },
  agree: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.ink },
});
