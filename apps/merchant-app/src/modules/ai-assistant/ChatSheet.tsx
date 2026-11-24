// CHAT mode: the typing chat, without the edge glow, plus a mic button for speech-to-text.
// The dark background fades; the white sheet slides up/down.
// Speaking fills the message box so the merchant can check it; nothing is sent until they press send.
// A proposed change (sold out, busy mode, deal) shows Yes / No buttons under the bubble.
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
  type TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../shared/theme/theme";
import StatsChart from "./StatsChart";
import type { MerchantChat } from "./useMerchantChat";
import { MAX_RECORDING_SECONDS, useSpeechToText } from "./useSpeechToText";

type Props = { active: boolean; chat: MerchantChat; onClose: () => void };

const OPEN_MS = 260;
const CLOSE_MS = 220;
const useNative = Platform.OS !== "web"; // the browser can't use the native animation driver

// Quick questions shown before the first message.
const SUGGESTIONS = [
  "How much did I sell today?",
  "Any orders still waiting?",
  "What's sold out?",
  "Summarise my latest reviews",
];

export default function ChatSheet({ active, chat, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { messages, loading, send, answer, clear } = chat;
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);

  // Voice input: the spoken words land in the message box (added to anything already typed).
  const speech = useSpeechToText((text) => {
    setDraft((previous) => (previous.trim() ? `${previous.trim()} ${text}` : text));
    requestAnimationFrame(() => inputRef.current?.focus());
  });
  const listening = speech.phase === "recording";
  const transcribing = speech.phase === "transcribing";
  const clock = `${Math.floor(speech.seconds / 60)}:${String(speech.seconds % 60).padStart(2, "0")}`;

  async function submit(text: string) {
    if (!text.trim() || loading) return;
    setDraft("");
    const reply = await send(text);
    if (reply) AccessibilityInfo.announceForAccessibility(reply.reply); // screen readers read the answer out
  }

  const progress = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: active ? OPEN_MS : CLOSE_MS,
      useNativeDriver: useNative,
    }).start();
    // Closing the chat while recording: throw the recording away and free the microphone.
    if (!active) void speech.cancel();
  }, [active]);

  const sheetSlide = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const canSend = draft.trim().length > 0 && !loading;

  return (
    // While hidden, it ignores touches so the voice overlay underneath gets them.
    <View style={StyleSheet.absoluteFill} pointerEvents={active ? "box-none" : "none"}>
      {/* Dark background: fades */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close assistant"
        />
      </Animated.View>

      {/* White sheet: slides, and moves up above the keyboard */}
      <KeyboardAvoidingView
        style={styles.bottom}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { height: Math.min(height * 0.75, 680), paddingBottom: insets.bottom + 12 },
            { transform: [{ translateY: sheetSlide }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>ScootMeal Assistant</Text>
            <View style={styles.headerButtons}>
              {messages.length > 0 && (
                <Pressable onPress={clear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear chat">
                  <Ionicons name="trash-outline" size={21} color={colors.stoneText} />
                </Pressable>
              )}
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View>
                <Text style={styles.body}>
                  Hi! Ask me about today's sales, orders, your menu or reviews. You can type in English, Malay or
                  Chinese.
                </Text>
                <View style={styles.chips}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} onPress={() => submit(s)} style={styles.chip} accessibilityRole="button">
                      <Text style={styles.chipText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((m) => (
                <View
                  key={m.id}
                  style={[styles.bubble, m.from === "user" ? styles.userBubble : styles.botBubble, m.error && styles.errorBubble, m.card && styles.chartBubble]}
                >
                  <Text style={[styles.bubbleText, m.from === "user" && styles.userText, m.error && styles.errorText]}>
                    {m.text}
                  </Text>
                  {m.card && <StatsChart card={m.card} />}
                  {m.confirm && m.confirmState === "pending" && (
                    <View style={styles.confirm}>
                      <Text style={styles.confirmText}>{m.confirm.summary}</Text>
                      <View style={styles.confirmRow}>
                        <Pressable
                          onPress={() => void answer(m.id, false)}
                          style={[styles.choice, styles.choiceNo]}
                          accessibilityRole="button"
                          accessibilityLabel="No, don't change anything"
                        >
                          <Text style={styles.choiceNoText}>No</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void answer(m.id, true)}
                          style={[styles.choice, styles.choiceYes]}
                          accessibilityRole="button"
                          accessibilityLabel={`Yes: ${m.confirm.summary}`}
                        >
                          <Text style={styles.choiceYesText}>Yes</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              ))
            )}
            {loading && (
              <View style={[styles.bubble, styles.botBubble, styles.thinking]}>
                <ActivityIndicator size="small" color={colors.turmericDeep} />
                <Text style={styles.thinkingText}>Thinking…</Text>
              </View>
            )}
          </ScrollView>

          {speech.error ? (
            <View style={styles.voiceErrorRow}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.chiliText} />
              <Text style={styles.voiceErrorText} accessibilityLiveRegion="polite">
                {speech.error}
              </Text>
              <Pressable onPress={speech.clearError} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss">
                <Ionicons name="close" size={15} color={colors.stoneText} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            {listening || transcribing ? (
              // While recording or turning speech into text, a status pill takes the text box's place.
              <View style={[styles.input, styles.voicePill]} accessibilityLiveRegion="polite">
                {listening ? (
                  <>
                    <View style={styles.recDot} />
                    <Text style={styles.voicePillText} numberOfLines={1}>
                      Listening… {clock}
                      <Text style={styles.voicePillHint}>
                        {speech.seconds >= MAX_RECORDING_SECONDS - 10 ? "  (stops at 1:00)" : "  Tap ■ when done"}
                      </Text>
                    </Text>
                    <Pressable onPress={() => void speech.cancel()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel recording">
                      <Ionicons name="close-circle" size={20} color={colors.stone} />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="small" color={colors.turmericDeep} />
                    <Text style={styles.voicePillText}>Turning speech into text…</Text>
                  </>
                )}
              </View>
            ) : (
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={(text) => {
                  setDraft(text);
                  if (speech.error) speech.clearError();
                }}
                placeholder="Ask or tap the mic…"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                maxLength={2000}
                multiline
                onSubmitEditing={() => submit(draft)}
                submitBehavior="submit"
                returnKeyType="send"
                accessibilityLabel="Message to the assistant"
              />
            )}

            <Pressable
              onPress={() => void (listening ? speech.stop() : speech.start())}
              disabled={transcribing}
              style={[styles.mic, listening && styles.micOn, transcribing && styles.micBusy]}
              accessibilityRole="button"
              accessibilityLabel={listening ? "Stop recording and use what I said" : "Speak your message"}
              accessibilityState={{ disabled: transcribing }}
            >
              <Ionicons name={listening ? "stop" : "mic"} size={19} color={listening ? colors.white : colors.ink} />
            </Pressable>

            {!listening && !transcribing && (
              <Pressable
                onPress={() => submit(draft)}
                disabled={!canSend}
                style={[styles.send, !canSend && styles.sendOff]}
                accessibilityRole="button"
                accessibilityLabel="Send"
                accessibilityState={{ disabled: !canSend }}
              >
                <Ionicons name="arrow-up" size={20} color={colors.white} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.overlay },
  bottom: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 18 },
  title: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  list: { flex: 1 },
  listContent: { paddingVertical: 8, gap: 8 },
  body: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, color: colors.stoneText, paddingHorizontal: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    backgroundColor: colors.amberTint,
  },
  chipText: { fontFamily: fonts.serifMedium, fontSize: 13, color: colors.amberText },
  bubble: { maxWidth: "85%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { alignSelf: "flex-end", backgroundColor: colors.ink, borderBottomRightRadius: 6 },
  botBubble: { alignSelf: "flex-start", backgroundColor: colors.paperDim, borderBottomLeftRadius: 6 },
  errorBubble: { backgroundColor: colors.chiliSoft },
    chartBubble: { width: "85%" }, // a chart needs room, so the bubble takes its full width
  confirm: { marginTop: 10, gap: 8 },
  confirmText: { fontFamily: fonts.serifSemiBold, fontSize: 14, color: colors.ink },
  confirmRow: { flexDirection: "row", gap: 8 },
  choice: { flex: 1, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  choiceNo: { borderWidth: 1, borderColor: colors.stoneLine, backgroundColor: colors.paper },
  choiceYes: { backgroundColor: colors.ink },
  choiceNoText: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
  choiceYesText: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.white },
  bubbleText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.ink },
  userText: { color: colors.white },
  errorText: { color: colors.chiliText },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8 },
  thinkingText: { fontFamily: fonts.serifMedium, fontSize: 14, color: colors.stoneText },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.stoneLine,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: 22,
    backgroundColor: colors.paperDim,
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { backgroundColor: colors.stoneSoft },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.stoneLine,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  micOn: { backgroundColor: colors.chili, borderColor: colors.chili },
  micBusy: { opacity: 0.4 },
  voicePill: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 0, paddingBottom: 0 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.chili },
  voicePillText: { flex: 1, fontFamily: fonts.serifMedium, fontSize: 14, color: colors.ink },
  voicePillHint: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.stoneText },
  voiceErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: colors.chiliSoft,
  },
  voiceErrorText: { flex: 1, fontFamily: fonts.serif, fontSize: 12.5, lineHeight: 17, color: colors.chiliText },
});