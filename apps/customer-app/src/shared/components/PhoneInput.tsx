import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, type, radius, fonts } from "../theme/theme";

/** Country calling codes offered at sign-up; Malaysia first because most users are local students. */
export const COUNTRY_CODES = [
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+673", country: "Brunei", flag: "🇧🇳" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
] as const;

/** Digits typed by the user, without the leading 0 used for local calls (012… becomes +60 12…). */
export function phoneDigits(number: string) {
  return number.replace(/\D/g, "").replace(/^0+/, "");
}
/** "+60 123456789", or "" when nothing was typed. */
export function fullPhone(code: string, number: string) {
  const digits = phoneDigits(number);
  return digits ? `${code} ${digits}` : "";
}
/** Split a saved number such as "+62 81234567" into the country code and the rest, for editing.
 *  A number without a known code (for example "012-345 6789") stays as typed under +60. */
export function splitPhone(saved: string | undefined): { code: string; number: string } {
  const s = (saved ?? "").trim();
  const match = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length).find((c) => s.startsWith(c.code));
  return match ? { code: match.code, number: s.slice(match.code.length).trim() } : { code: "+60", number: s };
}
/** A phone number must have 7 to 12 digits after the country code. */
export function phoneLooksValid(number: string) {
  const n = phoneDigits(number).length;
  return n >= 7 && n <= 12;
}

type Props = {
  code: string;
  onCode: (code: string) => void;
  number: string;
  onNumber: (number: string) => void;
  placeholder?: string;
  testID?: string;
};

/** Phone field with a country code button (🇲🇾 +60 ▾) that opens a list of countries. */
export default function PhoneInput({ code, onCode, number, onNumber, placeholder = "12-345 6789", testID }: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const current = COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];
  return (
    <>
      <View style={styles.row}>
        <Pressable
          style={styles.codeBtn}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t("auth.countryCode")}: ${current.country} ${current.code}`}
          testID={testID ? `${testID}-code` : undefined}
        >
          <Text style={styles.flag}>{current.flag}</Text>
          <Text style={styles.codeText}>{current.code}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.stone} />
        </Pressable>
        <TextInput
          style={styles.number}
          value={number}
          onChangeText={(t) => onNumber(t.replace(/[^\d -]/g, "").slice(0, 16))}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          testID={testID}
        />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>{t("auth.countryCode")}</Text>
            <FlatList
              data={COUNTRY_CODES as unknown as (typeof COUNTRY_CODES)[number][]}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => {
                const selected = item.code === current.code;
                return (
                  <Pressable
                    style={[styles.item, selected && styles.itemSelected]}
                    onPress={() => { onCode(item.code); setOpen(false); }}
                    accessibilityRole="button"
                    testID={`country-${item.code}`}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={styles.country}>{item.country}</Text>
                    <Text style={styles.itemCode}>{item.code}</Text>
                    {selected ? <Ionicons name="checkmark" size={18} color={colors.herb} /> : <View style={{ width: 18 }} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  flag: { fontSize: 16 },
  codeText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.text },
  number: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, fontFamily: fonts.serif, color: colors.text },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  sheet: { width: "100%", maxWidth: 380, maxHeight: "75%", backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.lg },
  title: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink, marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  itemSelected: { backgroundColor: colors.amberTint },
  country: { ...type.body, flex: 1, color: colors.text },
  itemCode: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.stoneText },
});
