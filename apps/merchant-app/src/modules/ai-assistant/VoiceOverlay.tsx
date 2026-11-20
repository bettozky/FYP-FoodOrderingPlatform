// VOICE mode (Siri-like, minimal): edge glow, the orb, and the latest answer in a card at the top.
// Opening it starts listening straight away. It stops by itself when the merchant goes quiet (or when they
// tap the orb), turns the speech into text, asks the assistant, shows the answer in the card and reads it
// out loud. If the answer asks the merchant something, it listens again by itself.
// Tapping anywhere closes it, except the orb and the chat button. Android back and the screen-reader
// "escape" gesture also close it. Closing stops the microphone and the voice.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../shared/theme/theme";
import EdgeGlow, { type GlowMode } from "./EdgeGlow";
import Orb from "./Orb";
import type { MerchantChat } from "./useMerchantChat";
import { useSpeaker } from "./useSpeaker";
import { useSpeechToText } from "./useSpeechToText";

type Props = { active: boolean; chat: MerchantChat; onClose: () => void; onOpenChat: () => void };

const FADE_MS = 220;
const LISTEN_DELAY_MS = 250; // let the overlay fade in before the microphone starts
const DIM = "rgba(21,19,15,0.35)"; // lighter than colors.overlay, so the app stays visible behind
const useNative = Platform.OS !== "web";

export default function VoiceOverlay({ active, chat, onClose, onOpenChat }: Props) {
  const insets = useSafeAreaInsets();
  const { messages, loading, send } = chat;
  const speaker = useSpeaker();

  // `activeRef` lets late results (a transcription or reply that arrives after closing) be ignored.
  const activeRef = useRef(active);
  activeRef.current = active;

  // With a screen reader on, the screen reader reads the answer instead (two voices at once is confusing).
  // Phones only: in a browser this check always says "on", because browsers can't tell.
  const screenReader = useRef(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => (screenReader.current = on));
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (on) => (screenReader.current = on));
    return () => sub.remove();
  }, []);

  // Speech -> text -> ask the assistant. Voice mode stops by itself when the merchant goes quiet.
  const speech = useSpeechToText(
    (text) => {
      if (activeRef.current) void ask(text);
    },
    { autoStop: true }
  );
  const listening = speech.phase === "recording";
  const transcribing = speech.phase === "transcribing";

  // The card shows only what was said in THIS voice session; older messages stay in the chat history.
  const [from, setFrom] = useState(0);
  useLayoutEffect(() => {
    if (active) setFrom(messages.length);
  }, [active]);
  const session = messages.slice(from);
  const question = [...session].reverse().find((m) => m.from === "user");
  const last = session[session.length - 1];
  const answer = last?.from === "bot" ? last : undefined;

  async function ask(text: string) {
    const reply = await send(text);
    if (!reply || !activeRef.current) return;

    if (screenReader.current) {
      AccessibilityInfo.announceForAccessibility(reply.reply);
      return;
    }

    // Read the answer out loud. If it asked the merchant something and wasn't interrupted, listen again.
    const finished = await speaker.speak(reply.spoken || reply.reply, reply.language ?? "en");
    if (finished && reply.asksQuestion && activeRef.current) void speech.start();
  }

  // Opening: start listening (after the fade-in). Closing: stop the microphone and the voice.
  useEffect(() => {
    if (!active) {
      void speech.cancel();
      speech.clearError();
      speaker.stop();
      return;
    }
    const timer = setTimeout(() => void speech.start(), LISTEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);

  // Orb: while speaking, tap = be quiet; while listening, tap = "I'm done"; otherwise tap = listen again.
  function onOrbPress() {
    if (speaker.speaking) speaker.stop();
    else if (listening) void speech.stop();
    else if (!transcribing && !loading) void speech.start();
  }

  const mode: GlowMode = !active
    ? "idle"
    : listening
      ? "listening"
      : transcribing || loading
        ? "thinking"
        : speaker.speaking
          ? "speaking"
          : "idle";

  const progress = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown
  useEffect(() => {
    Animated.timing(progress, { toValue: active ? 1 : 0, duration: FADE_MS, useNativeDriver: useNative }).start();
  }, [active]);

  // What the card shows: the spinner while turning speech into text, a voice error, or the question and answer.
  let card: React.ReactNode = null;
  if (transcribing) {
    card = <ActivityIndicator style={styles.spinner} color={colors.turmericDeep} />;
  } else if (speech.error) {
    card = <Text style={[styles.answer, styles.error]}>{speech.error}</Text>;
  } else if (question) {
    card = (
      <>
        <Text style={styles.question} numberOfLines={2}>
          {question.text}
        </Text>
        {answer ? (
          <Text style={[styles.answer, answer.error && styles.error]}>{answer.text}</Text>
        ) : (
          <ActivityIndicator style={styles.spinner} color={colors.turmericDeep} />
        )}
      </>
    );
  }

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: progress }]}
      pointerEvents={active ? "auto" : "none"}
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
    >
      {/* The whole screen is one big "close" button. The card sits inside it, so tapping the card closes too. */}
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose} accessible={false}>
        {card && <View style={[styles.card, { marginTop: insets.top + 12 }]}>{card}</View>}
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <View style={styles.row} pointerEvents="box-none">
          <Pressable onPress={onOpenChat} hitSlop={8} style={styles.chatButton} accessibilityRole="button" accessibilityLabel="Open chat">
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink} />
          </Pressable>
          <Orb mode={mode} level={listening ? speech.level : 0} onPress={onOrbPress} />
          <View style={styles.spacer} />
        </View>
      </View>

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
  spinner: { alignSelf: "flex-start" },
  bottom: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 24 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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