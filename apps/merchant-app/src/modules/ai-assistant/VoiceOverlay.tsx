// VOICE mode (Siri-like, minimal): edge glow, a small orb, and the latest answer in a card at the top.
// Tapping anywhere closes it, except the orb, the chat button and (later) Yes/No buttons.
// Android back and the screen-reader "escape" gesture also close it.
// Step 5: no microphone yet. The TEMPORARY text box lets you test the card; step 7 replaces it.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../shared/theme/theme";
import EdgeGlow, { type GlowMode } from "./EdgeGlow";
import Orb from "./Orb";
import type { MerchantChat } from "./useMerchantChat";

type Props = { active: boolean; chat: MerchantChat; onClose: () => void; onOpenChat: () => void };

const FADE_MS = 220;
const SPEAK_PULSE_MS = 1500;
const DIM = "rgba(21,19,15,0.35)"; // lighter than colors.overlay, so the app stays visible behind
const useNative = Platform.OS !== "web";

export default function VoiceOverlay({ active, chat, onClose, onOpenChat }: Props) {
  const insets = useSafeAreaInsets();
  const { messages, loading, send } = chat;
  const [draft, setDraft] = useState("");
  const inputRef = useRef<TextInputInstance>(null);

  // The card shows only what was said in THIS voice session; older messages stay in the chat history.
  const [from, setFrom] = useState(0);
  useLayoutEffect(() => {
    if (active) setFrom(messages.length);
  }, [active]);
  const session = messages.slice(from);
  const question = [...session].reverse().find((m) => m.from === "user");
  const last = session[session.length - 1];
  const answer = last?.from === "bot" ? last : undefined;

  // Glow and orb: listening by default, thinking while waiting, a short speaking pulse on each reply.
  const [speaking, setSpeaking] = useState(false);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (speakTimer.current) clearTimeout(speakTimer.current);
  }, []);
  const mode: GlowMode = !active ? "idle" : loading ? "thinking" : speaking ? "speaking" : "listening";

  async function submit() {
    if (!draft.trim() || loading) return;
    const text = draft;
    setDraft("");
    const reply = await send(text);
    if (reply) {
      AccessibilityInfo.announceForAccessibility(reply);
      setSpeaking(true);
      if (speakTimer.current) clearTimeout(speakTimer.current);
      speakTimer.current = setTimeout(() => setSpeaking(false), SPEAK_PULSE_MS);
    }
  }

  const progress = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown
  useEffect(() => {
    Animated.timing(progress, { toValue: active ? 1 : 0, duration: FADE_MS, useNativeDriver: useNative }).start();
  }, [active]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: progress }]}
      pointerEvents={active ? "auto" : "none"}
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
    >
      {/* The whole screen is one big "close" button. The card sits inside it, so tapping the card closes too. */}
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose} accessible={false}>
        {question && (
          <View style={[styles.card, { marginTop: insets.top + 12 }]}>
            <Text style={styles.question} numberOfLines={2}>
              {question.text}
            </Text>
            {answer ? (
              <Text style={[styles.answer, answer.error && styles.error]}>{answer.text}</Text>
            ) : (
              <ActivityIndicator style={styles.spinner} color={colors.turmericDeep} />
            )}
          </View>
        )}
      </Pressable>

      <KeyboardAvoidingView
        style={styles.bottom}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
          {/* TEMPORARY: type instead of talking, until the mic arrives in step 7 */}
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder="Type to test (temporary)"
            placeholderTextColor={colors.textFaint}
            returnKeyType="send"
            maxLength={2000}
            style={styles.testInput}
            accessibilityLabel="Message to the assistant"
          />
          <View style={styles.row} pointerEvents="box-none">
            <Pressable onPress={onOpenChat} hitSlop={8} style={styles.chatButton} accessibilityRole="button" accessibilityLabel="Open chat">
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink} />
            </Pressable>
            <Orb mode={mode} onPress={() => inputRef.current?.focus()} />
            <View style={styles.spacer} />
          </View>
        </View>
      </KeyboardAvoidingView>

      <EdgeGlow mode={mode} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: DIM },
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.paper,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  question: { fontFamily: fonts.serifMedium, fontSize: 13, color: colors.stoneText },
  answer: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, color: colors.ink },
  error: { color: colors.chiliText },
  spinner: { alignSelf: "flex-start", marginTop: 4 },
  bottom: { flex: 1, justifyContent: "flex-end" },
  controls: { alignItems: "center", gap: 18, paddingHorizontal: 24 },
  testInput: {
    alignSelf: "stretch",
    maxWidth: 420,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.ink,
  },
  row: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: { width: 44 },
});