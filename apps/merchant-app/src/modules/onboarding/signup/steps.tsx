// The 8 sign-up sections (task plan section 7). Each step only draws fields; the wizard owns state and validation.
import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, type, font } from "../../../shared/theme/theme";
import { Chips, Field, FieldError, Label, styles as f, ToggleRow, UploadTile } from "./fields";
import { canPickFiles } from "./pickFile";
import { ALLERGENS, BUSINESS_TYPES, DAYS, emptyMenuItem, ShopApplication } from "./types";
import { pinProblem, type Errors } from "./validate";
import { allergenName } from "../../../shared/i18n/labels";
import i18n from "../../../shared/i18n";

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
      <Field label={i18n.t("signup.ownerName")} value={a.ownerName} onChange={(v) => set({ ownerName: v })} error={errors.ownerName} placeholder={i18n.t("signup.ownerNamePh")} autoCapitalize="words" autoComplete="name" testID="reg-owner" />
      <Field label={i18n.t("signup.email")} value={a.email} onChange={(v) => set({ email: v })} error={errors.email} placeholder="you@restaurant.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" testID="reg-email" />
      <Field label={i18n.t("signup.phone")} value={a.phone} onChange={(v) => set({ phone: v })} error={errors.phone} placeholder="+60 12-345 6789" keyboardType="phone-pad" autoComplete="tel" hint={i18n.t("signup.phoneHint")} testID="reg-phone" />
      <Field label={i18n.t("signup.password")} value={a.password} onChange={(v) => set({ password: v })} error={errors.password} placeholder={i18n.t("signup.passwordPh")} secureTextEntry autoComplete="new-password" testID="reg-password" />
      <Field label={i18n.t("signup.confirm")} value={a.passwordConfirm} onChange={(v) => set({ passwordConfirm: v })} error={errors.passwordConfirm} placeholder={i18n.t("signup.confirmPh")} secureTextEntry autoComplete="new-password" testID="reg-password-confirm" />
    </>
  );
}

// 2. Business
export function BusinessStep({ a, set, errors }: StepProps) {
  return (
    <>
      <Field label={i18n.t("signup.shopName")} value={a.shopName} onChange={(v) => set({ shopName: v })} error={errors.shopName} placeholder={i18n.t("signup.shopNamePh")} autoCapitalize="words" testID="reg-business" />
      <Chips label={i18n.t("signup.businessType")} options={BUSINESS_TYPES} value={a.businessType} onPick={(k) => set({ businessType: k })} error={errors.businessType} testID="reg-type" />
      <Field label={i18n.t("signup.ssm")} value={a.ssmNumber} onChange={(v) => set({ ssmNumber: v })} error={errors.ssmNumber} placeholder={i18n.t("signup.ssmPh")} autoCapitalize="characters" testID="reg-ssm" />
      <Field label={i18n.t("signup.description")} value={a.description} onChange={(v) => set({ description: v })} error={errors.description} placeholder={i18n.t("signup.descriptionPh")} multiline maxLength={160} hint={`${a.description.trim().length}/160`} testID="reg-description" />
      <UploadTile label={i18n.t("signup.ssmFile")} kind="document" file={a.ssmCertificate} onChange={(x) => set({ ssmCertificate: x })} error={errors.ssmCertificate} privateNote testID="reg-ssm-file" />
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
    if (!geo) return setLocError(i18n.t("signup.noGeo"));
    setLocating(true);
    geo.getCurrentPosition(
      (p: any) => { set({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }); setLocating(false); },
      () => { setLocError(i18n.t("signup.geoFailed")); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const hasPin = !!a.lat.trim() && !!a.lng.trim();
  const pinBad = hasPin ? pinProblem(a.lat, a.lng) : "";
  // Keep only digits, a minus sign and ONE decimal point (a comma typed on a phone keyboard becomes a point).
  const cleanNumber = (v: string) => { const t = v.replace(/,/g, ".").replace(/[^0-9.\-]/g, ""); const i = t.indexOf("."); return i < 0 ? t : t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, ""); };
  return (
    <>
      <Field label={i18n.t("signup.address")} value={a.address} onChange={(v) => set({ address: v })} error={errors.address} placeholder={i18n.t("signup.addressPh")} autoCapitalize="words" testID="reg-location" />
      <View style={f.block}>
        <Label>{i18n.t("signup.pin")}</Label>
        <View style={[s.pinCard, !!errors.pin && f.inputError]}>
          <Ionicons name={pinBad ? "warning" : "location"} size={28} color={pinBad ? colors.chiliText : hasPin ? colors.turmericDeep : colors.stone} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={type.h3}>{pinBad ? i18n.t("signup.pinBad") : hasPin ? i18n.t("signup.pinSet") : i18n.t("signup.noPin")}</Text>
            <Text style={type.small}>{hasPin ? `${a.lat}, ${a.lng}` : i18n.t("signup.pinHelp")}</Text>
          </View>
        </View>
        <Pressable style={s.ghostBtn} onPress={useMyLocation} disabled={locating} accessibilityRole="button" testID="reg-use-location">
          <Ionicons name="navigate-outline" size={16} color={colors.ink} />
          <Text style={s.ghostText}>{locating ? i18n.t("signup.finding") : i18n.t("signup.useLocation")}</Text>
        </Pressable>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label={i18n.t("signup.lat")} value={a.lat} onChange={(v) => set({ lat: cleanNumber(v) })} placeholder="1.5533" keyboardType="numbers-and-punctuation" testID="reg-lat" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={i18n.t("signup.lng")} value={a.lng} onChange={(v) => set({ lng: cleanNumber(v) })} placeholder="110.3592" keyboardType="numbers-and-punctuation" testID="reg-lng" />
          </View>
        </View>
        <Text style={type.small}>{i18n.t("signup.pinShows")}</Text>
        <FieldError text={errors.pin || pinBad || locError} />
      </View>
      <Field label={i18n.t("signup.landmark")} value={a.landmark} onChange={(v) => set({ landmark: v })} placeholder={i18n.t("signup.landmarkPh")} testID="reg-landmark" />
    </>
  );
}

// 4. Food
export function FoodStep({ a, set, errors }: StepProps) {
  return (
    <>
      <Field label={i18n.t("signup.cuisine")} value={a.cuisine} onChange={(v) => set({ cuisine: v })} error={errors.cuisine} placeholder={i18n.t("signup.cuisinePh")} autoCapitalize="words" hint={i18n.t("signup.cuisineHint")} testID="reg-cuisine" />
      <Chips label={i18n.t("signup.priceRange")} options={[{ key: 1, label: "RM" }, { key: 2, label: "RM RM" }, { key: 3, label: "RM RM RM" }]} value={a.priceRange} onPick={(k) => set({ priceRange: k as 1 | 2 | 3 })} error={errors.priceRange} testID="reg-price" />
      <ToggleRow label={i18n.t("signup.veg")} sub={i18n.t("signup.vegSub")} value={a.vegetarianOptions} onChange={(v) => set({ vegetarianOptions: v })} testID="reg-veg" />
      <Chips label={i18n.t("signup.halal")} options={[{ key: "yes", label: i18n.t("signup.halalYes") }, { key: "no", label: i18n.t("applicant.no") }]} value={a.halal === null ? null : a.halal ? "yes" : "no"} onPick={(k) => set({ halal: k === "yes" })} error={errors.halal} testID="reg-halal" />
      {a.halal ? <UploadTile label={i18n.t("signup.halalFile")} kind="document" file={a.halalCertificate} onChange={(x) => set({ halalCertificate: x })} error={errors.halalCertificate} privateNote testID="reg-halal-file" /> : null}
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
          <Label>{i18n.t("hours.title")}</Label>
          <Pressable onPress={copyMonday} hitSlop={8} accessibilityRole="button" testID="reg-copy-hours">
            <Text style={s.link}>{i18n.t("hours.copyMonday")}</Text>
          </Pressable>
        </View>
        <View style={[s.hoursCard, !!errors.hours && f.inputError]}>
          {a.hours.map((h, i) => (
            <View key={h.day} style={s.dayRow}>
              <Text style={[type.body, s.dayLabel]}>{DAYS[i].short}</Text>
              {h.closed ? (
                <Text style={[type.bodyMuted, { flex: 1 }]}>{i18n.t("hours.closed")}</Text>
              ) : (
                <View style={s.times}>
                  <TextInput style={s.time} value={h.open} onChangeText={(v: string) => setDay(i, { open: v })} placeholder="09:00" placeholderTextColor={colors.textFaint} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel={i18n.t("hours.opens", { day: DAYS[i].label })} testID={`reg-open-${h.day}`} />
                  <Text style={type.bodyMuted}>–</Text>
                  <TextInput style={s.time} value={h.close} onChangeText={(v: string) => setDay(i, { close: v })} placeholder="21:00" placeholderTextColor={colors.textFaint} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel={i18n.t("hours.closes", { day: DAYS[i].label })} testID={`reg-close-${h.day}`} />
                </View>
              )}
              <Switch value={!h.closed} onValueChange={(open: boolean) => setDay(i, { closed: !open })} trackColor={{ false: colors.stoneLine, true: colors.herb }} thumbColor={colors.white} accessibilityLabel={i18n.t("hours.openOn", { day: DAYS[i].label })} />
            </View>
          ))}
        </View>
        <FieldError text={errors.hours} />
      </View>
      <View style={f.block}>
        <Label>{i18n.t("signup.howGet")}</Label>
        <ToggleRow label={i18n.t("mode.delivery")} value={a.delivery} onChange={(v) => set({ delivery: v })} testID="reg-delivery" />
        <ToggleRow label={i18n.t("signup.pickup")} value={a.pickup} onChange={(v) => set({ pickup: v })} testID="reg-pickup" />
        <ToggleRow label={i18n.t("mode.dineIn")} value={a.dineIn} onChange={(v) => set({ dineIn: v })} testID="reg-dinein" />
        <FieldError text={errors.service} />
      </View>
      {a.dineIn ? <Field label={i18n.t("signup.seats")} value={a.seats} onChange={(v) => set({ seats: v })} error={errors.seats} placeholder={i18n.t("menu.eg", { v: "12" })} keyboardType="number-pad" testID="reg-seats" /> : null}
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field label={i18n.t("signup.prep")} value={a.prepMinutes} onChange={(v) => set({ prepMinutes: v })} error={errors.prepMinutes} placeholder="15" keyboardType="number-pad" testID="reg-prep" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={i18n.t("signup.minOrder")} value={a.minOrder} onChange={(v) => set({ minOrder: v })} error={errors.minOrder} placeholder={i18n.t("signup.optional")} keyboardType="decimal-pad" testID="reg-min-order" />
        </View>
      </View>
    </>
  );
}

// 6. Allergens and hygiene
// One row per allergen with a real checkbox and local examples, plus "None of these" so an empty answer is never a guess.
// Ticking an allergen clears "None of these", and ticking "None of these" clears the allergens.
export function HygieneStep({ a, set, errors }: StepProps) {
  const toggle = (k: string) =>
    set({ noAllergens: false, allergens: a.allergens.includes(k) ? a.allergens.filter((x) => x !== k) : ALLERGENS.map((x) => x.name).filter((n) => n === k || a.allergens.includes(n)) });
  const toggleNone = () => set(a.noAllergens ? { noAllergens: false } : { noAllergens: true, allergens: [] });
  return (
    <>
      <View style={f.block}>
        <Label>{i18n.t("signup.whichAllergens")}</Label>
        <Text style={type.small}>{i18n.t("signup.tickEvery")}</Text>
        <View style={[s.checkList, !!errors.allergens && f.inputError]}>
          {ALLERGENS.map((x, i) => (
            <CheckRow key={x.name} label={allergenName(x.name)} sub={x.examples} checked={a.allergens.includes(x.name)} onPress={() => toggle(x.name)} first={i === 0} testID={`reg-allergen-${x.name}`} />
          ))}
          <CheckRow label={i18n.t("signup.none")} sub={i18n.t("signup.noneSub")} checked={a.noAllergens} onPress={toggleNone} none testID="reg-allergen-none" />
        </View>
        <Text style={type.small} accessibilityLiveRegion="polite">
          {a.noAllergens ? i18n.t("signup.saidNone") : a.allergens.length ? i18n.t("signup.ticked", { n: a.allergens.length, list: a.allergens.map(allergenName).join(i18n.t("common.listSep")) }) : i18n.t("signup.nothingTicked")}
        </Text>
        <FieldError text={errors.allergens} />
      </View>
      <Field label={i18n.t("signup.licence")} value={a.licenceNo} onChange={(v) => set({ licenceNo: v })} error={errors.licenceNo} placeholder="e.g. MBJB-LK-2024-08812" autoCapitalize="characters" testID="reg-licence" />
    </>
  );
}

// 7. Pictures
export function PicturesStep({ a, set, errors }: StepProps) {
  const setItem = (i: number, patch: Partial<ShopApplication["menuItems"][number]>) => set({ menuItems: a.menuItems.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return (
    <>
      <UploadTile label={i18n.t("signup.logo")} kind="image" file={a.logo} onChange={(x) => set({ logo: x })} error={errors.logo} testID="reg-logo" />
      <UploadTile label={i18n.t("signup.cover")} kind="image" file={a.cover} onChange={(x) => set({ cover: x })} error={errors.cover} testID="reg-cover" />
      <Label>{i18n.t("signup.menuItems")}</Label>
      {a.menuItems.map((m, i) => (
        <View key={i} style={[s.dishCard, !!errors[`menu${i}`] && f.inputError]}>
          <View style={s.rowBetween}>
            <Text style={type.h3}>{i18n.t("signup.dishN", { n: i + 1 })}</Text>
            {a.menuItems.length > 3 ? (
              <Pressable onPress={() => set({ menuItems: a.menuItems.filter((_, j) => j !== i) })} hitSlop={8} accessibilityRole="button" accessibilityLabel={i18n.t("signup.removeDish", { n: i + 1 })}>
                <Text style={s.link}>{i18n.t("photo.remove")}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={s.row}>
            <View style={{ flex: 2 }}>
              <Field label={i18n.t("signup.dishName")} value={m.name} onChange={(v) => setItem(i, { name: v })} placeholder={i18n.t("signup.dishNamePh")} autoCapitalize="words" testID={`reg-dish-${i}-name`} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={i18n.t("signup.price")} value={m.price} onChange={(v) => setItem(i, { price: v })} placeholder="8.50" keyboardType="decimal-pad" testID={`reg-dish-${i}-price`} />
            </View>
          </View>
          <Field label={i18n.t("signup.dishDesc")} value={m.description} onChange={(v) => setItem(i, { description: v })} placeholder={i18n.t("signup.oneLine")} maxLength={120} testID={`reg-dish-${i}-desc`} />
          {/* Only the allergens ticked in step 6 are offered, so the list stays short. Shown to customers as "Contains: ...". */}
          {!a.noAllergens && a.allergens.length ? (
            <Chips
              label={i18n.t("signup.dishAllergens")}
              options={a.allergens.map((k) => ({ key: k, label: allergenName(k) }))}
              selected={m.allergens.filter((x) => a.allergens.includes(x))}
              onPick={(k) => setItem(i, { allergens: m.allergens.includes(k) ? m.allergens.filter((x) => x !== k) : [...m.allergens, k] })}
              testID={`reg-dish-${i}-allergen`}
            />
          ) : null}
          <UploadTile label={i18n.t("menu.photo")} kind="image" file={m.photo} onChange={(x) => setItem(i, { photo: x })} testID={`reg-dish-${i}-photo`} />
          <FieldError text={errors[`menu${i}`]} />
        </View>
      ))}
      {a.menuItems.length < 10 ? (
        <Pressable style={s.ghostBtn} onPress={() => set({ menuItems: [...a.menuItems, emptyMenuItem()] })} accessibilityRole="button" testID="reg-add-dish">
          <Ionicons name="add" size={18} color={colors.ink} />
          <Text style={s.ghostText}>{i18n.t("signup.addDish")}</Text>
        </Pressable>
      ) : null}
      <FieldError text={errors.menu} />
      <Text style={type.small}>{i18n.t("signup.ownPhotos")}</Text>
    </>
  );
}

// 8. Review and agree
export function ReviewStep({ a, set, errors, goTo }: StepProps) {
  const open = a.hours.filter((h) => !h.closed);
  const service = [a.delivery && i18n.t("mode.delivery"), a.pickup && i18n.t("signup.pickup"), a.dineIn && i18n.t("signup.dineInSeats", { n: a.seats || "?" })].filter(Boolean).join(i18n.t("common.listSep"));
  const photos = [a.logo && i18n.t("signup.rLogo"), a.cover && i18n.t("signup.rCover"), i18n.t("signup.rDishPhotos", { n: a.menuItems.filter((m) => m.photo).length })].filter(Boolean).join(i18n.t("common.listSep"));
  const rows: [string, string][] = [
    [i18n.t("signup.step_account"), `${a.ownerName.trim()} · ${a.email.trim()} · ${a.phone.trim()}`],
    [i18n.t("signup.step_business"), `${a.shopName.trim()} · ${a.businessType ? BUSINESS_TYPES.find((b) => b.key === a.businessType)?.label ?? "" : ""} · SSM ${a.ssmNumber.trim()}${a.ssmCertificate ? ` · ${i18n.t("signup.rCert")}` : ""}`],
    [i18n.t("signup.step_location"), `${a.address.trim()}${a.landmark.trim() ? ` · ${a.landmark.trim()}` : ""} · ${i18n.t("signup.rPin", { lat: a.lat, lng: a.lng })}`],
    [i18n.t("signup.step_food"), `${a.cuisine.trim()} · ${"RM ".repeat(a.priceRange ?? 0).trim()}${a.vegetarianOptions ? ` · ${i18n.t("signup.rVeg")}` : ""} · ${a.halal ? i18n.t("signup.rHalal") : i18n.t("signup.rNotHalal")}`],
    [i18n.t("signup.step_service"), `${i18n.t("signup.rOpen", { n: open.length, open: open[0]?.open ?? "", close: open[0]?.close ?? "", day: DAYS.find((d) => d.key === open[0]?.day)?.label ?? "" })} · ${service} · ${i18n.t("signup.rPrep", { n: a.prepMinutes })}${a.minOrder.trim() ? ` · ${i18n.t("signup.rMin", { amount: a.minOrder.trim() })}` : ""}`],
    [i18n.t("signup.step_hygiene"), `${a.noAllergens ? i18n.t("signup.rNone") : a.allergens.map(allergenName).join(i18n.t("common.listSep"))} · ${i18n.t("signup.rLicence", { no: a.licenceNo.trim() })}`],
    [i18n.t("signup.step_pictures"), `${photos} · ${i18n.t("signup.rDishes", { n: a.menuItems.length })}`],
  ];
  return (
    <>
      {rows.map(([title, value], i) => (
        <View key={title} style={s.reviewRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={type.h3}>{title}</Text>
            <Text style={type.small}>{value}</Text>
          </View>
          <Pressable onPress={() => goTo?.(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={i18n.t("ann.editA11y", { title })} testID={`reg-edit-${i}`}>
            <Text style={s.link}>{i18n.t("common.edit")}</Text>
          </Pressable>
        </View>
      ))}
      {!canPickFiles ? (
        <View style={s.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.amberText} />
          <Text style={[type.small, { flex: 1, color: colors.amberText }]}>{i18n.t("signup.noFilesNote")}</Text>
        </View>
      ) : null}
      <Pressable style={s.agree} onPress={() => set({ agreedTerms: !a.agreedTerms })} accessibilityRole="checkbox" accessibilityState={{ checked: a.agreedTerms }} testID="reg-terms">
        <View style={[s.box, a.agreedTerms && s.boxOn]}>{a.agreedTerms ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}</View>
        <Text style={[type.body, { flex: 1 }]}>{i18n.t("signup.agree")}</Text>
      </Pressable>
      <FieldError text={errors.agreedTerms} />
      <Text style={type.small}>{i18n.t("signup.noIc")}</Text>
    </>
  );
}

/** A full-width checkbox row: name, small examples underneath, and a tick box on the left. */
function CheckRow({ label, sub, checked, onPress, first, none, testID }: { label: string; sub: string; checked: boolean; onPress: () => void; first?: boolean; none?: boolean; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.checkRow, !first && s.checkRowLine, none && s.checkRowNone, checked && s.checkRowOn]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${label}. ${sub}`}
      testID={testID}
    >
      <View style={[s.box, checked && s.boxOn]}>{checked ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={type.h3}>{label}</Text>
        <Text style={type.small}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export const STEP_COMPONENTS = [AccountStep, BusinessStep, LocationStep, FoodStep, ServiceStep, HygieneStep, PicturesStep, ReviewStep];

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { ...font.displayBold, fontSize: 13, color: colors.amberText },
  pinCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.paperDim, borderWidth: 1, borderColor: colors.paperDim },
  ghostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.paper },
  ghostText: { ...font.display, fontSize: 14, color: colors.ink },
  hoursCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  dayRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48 },
  dayLabel: { width: 40, ...font.display },
  times: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  time: { width: 64, textAlign: "center", borderWidth: 1, borderColor: colors.stone, borderRadius: radius.sm, paddingVertical: 6, ...font.serifMedium, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  dishCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, borderRadius: radius.sm },
  note: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.amberTint },
  agree: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.ink },
  checkList: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, borderRadius: radius.sm, overflow: "hidden" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 56 },
  checkRowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.stoneSoft },
  checkRowNone: { borderTopWidth: 2, borderTopColor: colors.stone },
  checkRowOn: { backgroundColor: colors.amberTint },
});
