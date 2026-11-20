// The assistant panel that slides up when the bubble is tapped: a chat with the stall assistant.
// The dark background fades in/out; the white sheet slides up/down.
// The edge glow shows "thinking" while waiting for a reply, then a short "speaking" pulse when it arrives.
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../shared/theme/theme";
import EdgeGlow, { type GlowMode } from "./EdgeGlow";
import { useMerchantChat } from "./useMerchantChat";

type Props = { visible: boolean; onClose: () => void };

const OPEN_MS = 260;
const CLOSE_MS = 220;
const SPEAK_PULSE_MS = 1500;
const useNative = Platform.OS !== "web"; // the browser can't use the native animation driver

// Quick questions shown before the first message.
const SUGGESTIONS = [
  "How much did I sell today?",
  "Any orders still waiting?",
  "What's sold out?",
  "Summarise my latest reviews",
];

export default function AssistantPanel({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { messages, loading, send, clear } = useMerchantChat();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Glow: thinking while waiting, a short speaking pulse when the reply arrives, otherwise off.
  const [speaking, setSpeaking] = useState(false);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (speakTimer.current) clearTimeout(speakTimer.current);
  }, []);
  const glow: GlowMode = !visible ? "idle" : loading ? "thinking" : speaking ? "speaking" : "idle";

  async function submit(text: string) {
    if (!text.trim() || loading) return;
    setDraft("");
    const reply = await send(text);
    if (reply) {
      AccessibilityInfo.announceForAccessibility(reply); // screen readers read the answer out
      setSpeaking(true);
      if (speakTimer.current) clearTimeout(speakTimer.current);
      speakTimer.current = setTimeout(() => setSpeaking(false), SPEAK_PULSE_MS);
    }
  }

  // `shown` keeps the Modal on screen while the closing animation plays.
  const [shown, setShown] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(400); // measured once the sheet is drawn
  const progress = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = open

  useEffect(() => {
    if (visible) {
      setShown(true);
      Animated.timing(progress, { toValue: 1, duration: OPEN_MS, useNativeDriver: useNative }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: CLOSE_MS, useNativeDriver: useNative }).start(
        ({ finished }) => {
          if (finished) setShown(false); // only hide after the animation has played
        }
      );
    }
  }, [visible]);

  const sheetSlide = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] });
  const canSend = draft.trim().length > 0 && !loading;

  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={onClose}>
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
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
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
                  style={[styles.bubble, m.from === "user" ? styles.userBubble : styles.botBubble, m.error && styles.errorBubble]}
                >
                  <Text style={[styles.bubbleText, m.from === "user" && styles.userText, m.error && styles.errorText]}>
                    {m.text}
                  </Text>
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

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about your stall…"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              maxLength={2000}
              multiline
              onSubmitEditing={() => submit(draft)}
              submitBehavior="submit"
              returnKeyType="send"
              accessibilityLabel="Message to the assistant"
            />
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
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Glow on top of everything inside the panel */}
      <EdgeGlow mode={glow} />
    </Modal>
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
});