import React from "react";
import { Platform, Pressable, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, ui } from "../theme/theme";

// The one search field (iOS style: grey, rounded, magnifier on the left, clear button on the right).
type Props = Omit<TextInputProps, "style" | "onChangeText" | "value"> & {
  value: string;
  onChangeText: (t: string) => void;
  style?: ViewStyle;
};

export default function SearchField({ value, onChangeText, style, placeholder = "Search", ...rest }: Props) {
  return (
    <View style={[ui.searchField, style]}>
      <Ionicons name="search" size={17} color={colors.stoneText} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.stoneText}
        accessibilityLabel={typeof placeholder === "string" ? placeholder : "Search"}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
        {...rest}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.stone} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // On web the browser draws its own focus box inside the field; the field itself is the visible control.
  input: { flex: 1, minWidth: 0, paddingVertical: 10, fontSize: 16, ...font.serif, color: colors.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
});
