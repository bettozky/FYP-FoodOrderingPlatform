// Small form pieces for the shop sign-up, styled with theme.ts tokens only (no raw hex codes).
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Switch, Text, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing, type } from "../../../shared/theme/theme";
import { canPickFiles, pickFile, PickKind } from "./pickFile";
import type { PickedFile } from "./types";

export function FieldError({ text, testID }: { text?: string; testID?: string }) {
  if (!text) return null;
  return (
    <Text style={styles.error} testID={testID} accessibilityLiveRegion="polite">
      {text}
    </Text>
  );
}

export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

type FieldProps = Omit<TextInputProps, "onChange" | "onChangeText" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  testID?: string;
};

export function Field({ label, value, onChange, error, hint, testID, multiline, ...rest }: FieldProps) {
  return (
    <View style={styles.block}>
      <Label>{label}</Label>
      <TextInput
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputError]}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        multiline={multiline}
        testID={testID}
        {...rest}
      />
      {hint && !error ? <Text style={type.small}>{hint}</Text> : null}
      <FieldError text={error} />
    </View>
  );
}

type ChipOption<K extends string | number> = { key: K; label: string };

/** Single choice (value) or multi choice (selected). */
export function Chips<K extends string | number>({
  label, options, value, selected, onPick, error, testID,
}: {
  label?: string; options: ChipOption<K>[]; value?: K | null; selected?: K[]; onPick: (k: K) => void; error?: string; testID?: string;
}) {
  return (
    <View style={styles.block}>
      {label ? <Label>{label}</Label> : null}
      <View style={styles.chips} accessibilityRole={selected ? undefined : "radiogroup"}>
        {options.map((o) => {
          const on = selected ? selected.includes(o.key) : value === o.key;
          return (
            <Pressable
              key={String(o.key)}
              onPress={() => onPick(o.key)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole={selected ? "checkbox" : "radio"}
              accessibilityState={selected ? { checked: on } : { selected: on }}
              testID={testID ? `${testID}-${o.key}` : undefined}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FieldError text={error} />
    </View>
  );
}

export function ToggleRow({ label, sub, value, onChange, testID }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={type.h3}>{label}</Text>
        {sub ? <Text style={type.small}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.stoneLine, true: colors.herb }}
        thumbColor={colors.white}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function UploadTile({
  label, kind, file, onChange, error, privateNote, testID,
}: {
  label: string; kind: PickKind; file: PickedFile | null; onChange: (f: PickedFile | null) => void; error?: string; privateNote?: boolean; testID?: string;
}) {
  const [notice, setNotice] = useState("");
  const isImage = !!file && file.mimeType.startsWith("image/");

  async function choose() {
    setNotice("");
    const r = await pickFile(kind);
    if ("file" in r) onChange(r.file);
    else if ("unavailable" in r) setNotice(r.unavailable);
  }

  return (
    <View style={styles.block}>
      <Pressable
        onPress={choose}
        style={[styles.tile, file ? styles.tileDone : styles.tileEmpty, !!error && styles.inputError]}
        accessibilityRole="button"
        accessibilityLabel={file ? `${label}: ${file.name}. Tap to replace.` : `Upload ${label}`}
        testID={testID}
      >
        {isImage ? (
          <Image source={{ uri: file!.uri }} style={styles.thumb} accessibilityIgnoresInvertColors />
        ) : (
          <Ionicons name={file ? "checkmark-circle" : "cloud-upload-outline"} size={24} color={file ? colors.herb : colors.stone} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={type.h3}>{label}</Text>
          <Text style={type.small} numberOfLines={1}>
            {file ? `${file.name} · ${kb(file.size)}` : kind === "image" ? "JPG or PNG, up to 2 MB" : "PDF, JPG or PNG, up to 2 MB"}
          </Text>
        </View>
        {file ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${label}`}>
            <Ionicons name="close" size={18} color={colors.stoneText} />
          </Pressable>
        ) : null}
      </Pressable>
      {privateNote ? (
        <View style={styles.privateRow}>
          <Ionicons name="lock-closed-outline" size={13} color={colors.stoneText} />
          <Text style={type.small}>Private, only the admin sees this</Text>
        </View>
      ) : null}
      {!canPickFiles && !file ? <Text style={type.small}>You can add this after approval.</Text> : null}
      <FieldError text={error || notice} />
    </View>
  );
}

export const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  label: { ...type.small, color: colors.ink },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.stone, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 48, fontFamily: fonts.serif, fontSize: 15, color: colors.text,
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  inputError: { borderColor: colors.chili, borderWidth: 1.5 },
  error: { ...type.small, color: colors.chiliText },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.stoneLine, backgroundColor: colors.paper, minHeight: 40, justifyContent: "center" },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.white },
  toggleRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: 14, paddingVertical: spacing.md,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine, borderRadius: radius.sm,
  },
  tile: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, minHeight: 64 },
  tileEmpty: { backgroundColor: colors.paper, borderColor: colors.stone, borderStyle: "dashed" },
  tileDone: { backgroundColor: colors.herbLight, borderColor: colors.herb },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.paperDim },
  privateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
