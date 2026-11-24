// VOICE mode (Siri-like, minimal): edge glow, the orb, and the latest answer in a card at the top.
// Opening it starts listening straight away. It stops by itself when the customer goes quiet (or when they tap the
// orb), turns the speech into text, asks the assistant, shows the answer in the card and reads it out loud.
// The card can also show: dish cards (Add), a Yes / No question (add to cart, open payment, open cart), or a
// "which order?" list. "Where is my order?" opens the order's tracking screen after the answer is read out.
// The customer can say "yes" / "no" (English, Malay or Chinese) instead of tapping.
// Tapping anywhere else closes it. Android back and the screen-reader "escape" gesture also close it.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { colors, fonts } from "../../shared/theme/theme";
import EdgeGlow, { type GlowMode } from "./EdgeGlow";
import Orb from "./Orb";
import type { AssistantActions, Followup } from "./useAssistantActions";
import type { ChatMessage, CustomerChat } from "./useCustomerChat";
import { useSpeaker, type SpeakLanguage } from "./useSpeaker";
import { useSpeechToText } from "./useSpeechToText";
import { yesOrNo } from "./yesNo";

type Props = { active: boolean; chat: CustomerChat; actions: AssistantActions; onClose: () => void; onOpenChat: () => void };

const FADE_MS = 220;
const LISTEN_DELAY_MS = 250; // let the overlay fade in before the microphone starts
const MAX_DISHES = 3; // dish cards shown in the voice card (the chat shows all of them)
const DIM = "rgba(21,19,15,0.35)"; // lighter than colors.overlay, so the app stays visible behind
const useNative = Platform.OS !== "web";

/** The app's language, for reading out text the app writes itself. */
const appLanguage = (): SpeakLanguage => (i18n.language === "ms" || i18n.language === "zh" ? i18n.language : "en");

export default function VoiceOverlay({ active, chat, actions, onClose, onOpenChat }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { messages, loading, send, pending } = chat;
  const speaker = useSpeaker();
  const [dishStatus, setDishStatus] = useState<Record<string, string>>({});

  // `activeRef` lets late results (a transcription or reply that arrives after closing) be ignored.
  const activeRef = useRef(active);
  activeRef.current = active;

  // With a screen reader on (phones), it reads the answer instead of our voice. Browsers can't tell, so not there.
  const screenReader = useRef(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => (screenReader.current = on));
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (on) => (screenReader.current = on));
    return () => sub.remove();
  }, []);

  // Speech -> text. While a Yes / No is waiting, a spoken "yes" / "no" answers it; anything else is a new question.
  const speech = useSpeechToText(
    (text) => {
      if (!activeRef.current) return;
      const yes = pending ? yesOrNo(text) : null;
      if (pending && yes !== null) void respond(pending, yes);
      else void ask(text);
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

  /** Reads text out loud (or lets the screen reader do it). Resolves true if it finished without being stopped. */
  async function say(text: string, language: SpeakLanguage, spoken?: string): Promise<boolean> {
    if (screenReader.current) {
      AccessibilityInfo.announceForAccessibility(text);
      return false; // don't start listening over the screen reader
    }
    return speaker.speak(spoken || text, language);
  }

  async function ask(text: string) {
    const reply = await send(text);
    if (!reply || !activeRef.current) return;
    const finished = await say(reply.reply, reply.language ?? "en", reply.spoken);
    if (!activeRef.current) return;
    if (reply.navigate) actions.go(reply.navigate); // order status: open its tracking screen
    else if (finished && reply.asksQuestion) void speech.start();
  }

  // Yes / No (tapped or spoken). The assistant may answer back (and ask again, e.g. "Open your cart?").
  async function respond(message: ChatMessage, yes: boolean) {
    speaker.stop();
    void speech.cancel();
    const followup: Followup = await actions.answer(message, yes);
    if (!followup || !activeRef.current) return;
    const finished = await say(followup.text, appLanguage());
    if (finished && followup.asksQuestion && activeRef.current) void speech.start();
  }

  // "Add" on a dish card in the voice card.
  async function addFromCard(dishId: string, price: number) {
    speaker.stop();
    void speech.cancel();
    const result = await actions.addDish(dishId, price);
    setDishStatus((s) => ({ ...s, [dishId]: result.message }));
    if (!result.added || !activeRef.current) return;
    const text = i18n.t("ai.openCartAsk", { name: result.dishName });
    chat.say(text, { kind: "open_cart", summary: text });
    const finished = await say(text, appLanguage());
    if (finished && activeRef.current) void speech.start();
  }

  // Opening: start listening (after the fade-in). Closing: stop the microphone and the voice.
  useEffect(() => {
    if (!active) {
      void speech.cancel();
      speech.clearError();
      speaker.stop();
      return;
    }
    setDishStatus({});
    const timer = setTimeout(() => void speech.start(), LISTEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);

  // Orb: while speaking, tap = be quiet; while listening, tap = "I'm done"; otherwise tap = listen again.
  function onOrbPress() {
    if (speaker.speaking) speaker.stop();
    else if (listening) void speech.stop();
    else if (!transcribing && !loading && !actions.adding) void speech.start();
  }

  const mode: GlowMode = !active
    ? "idle"
    : listening
      ? "listening"
      : transcribing || loading || actions.adding
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
          <>
            <Text style={[styles.answer, answer.error && styles.error]}>{answer.text}</Text>

            {/* Dish cards: a few compact rows with Add */}
            {answer.recommendations?.slice(0, MAX_DISHES).map(({ dish, merchant }) => (
              <View key={dish.id} style={styles.dish}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
                  <Text style={styles.dishShop} numberOfLines={1}>
                    {merchant.name} · RM{dish.price.toFixed(2)}
                  </Text>
                  {dishStatus[dish.id] ? <Text style={styles.dishStatus}>{dishStatus[dish.id]}</Text> : null}
                </View>
                <Pressable
                  onPress={() => void addFromCard(dish.id, dish.price)}
                  disabled={actions.adding}
                  style={[styles.add, actions.adding && styles.addOff]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("ai.addToCart")}: ${dish.name}`}
                >
                  <Ionicons name="add" size={18} color={colors.white} />
                </Pressable>
              </View>
            ))}

            {/* Yes / No question */}
            {answer.confirm && answer.confirmState === "pending" && (
              <View style={styles.confirm}>
                {answer.confirm.summary !== answer.text && <Text style={styles.confirmText}>{answer.confirm.summary}</Text>}
                <View style={styles.confirmRow}>
                  <Pressable onPress={() => void respond(answer, false)} style={[styles.choice, styles.choiceNo]} accessibilityRole="button" accessibilityLabel={t("ai.noChange")}>
                    <Text style={styles.choiceNoText}>{t("ai.no")}</Text>
                  </Pressable>
                  <Pressable onPress={() => void respond(answer, true)} style={[styles.choice, styles.choiceYes]} accessibilityRole="button" accessibilityLabel={`${t("ai.yes")}: ${answer.confirm.summary}`}>
                    <Text style={styles.choiceYesText}>{t("ai.yes")}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Which order to pay */}
            {answer.choices && !answer.choiceDone && (
              <View style={styles.confirm}>
                {answer.choices.options.map((o) => (
                  <Pressable
                    key={o.orderId}
                    onPress={() => actions.choose(answer, o)}
                    style={styles.option}
                    accessibilityRole="button"
                    accessibilityLabel={t("ai.pickOrder", { label: o.label })}
                  >
                    <Text style={styles.optionText} numberOfLines={1}>{o.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.stoneText} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
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
      {/* The whole screen is one big "close" button. The card sits inside it, so tapping the card's text closes too. */}
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose} accessible={false}>
        {card && <View style={[styles.card, { marginTop: insets.top + 12 }]}>{card}</View>}
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <View style={styles.row} pointerEvents="box-none">
          <Pressable onPress={onOpenChat} hitSlop={8} style={styles.chatButton} accessibilityRole="button" accessibilityLabel={t("ai.openChat")}>
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
  dish: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.paperDim,
  },
  dishName: { fontFamily: fonts.serifSemiBold, fontSize: 14.5, color: colors.ink },
  dishShop: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.stoneText },
  dishStatus: { fontFamily: fonts.serifMedium, fontSize: 12, color: colors.amberText, marginTop: 2 },
  add: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  addOff: { opacity: 0.4 },
  confirm: { marginTop: 8, gap: 10 },
  confirmText: { fontFamily: fonts.serifSemiBold, fontSize: 15, color: colors.ink },
  confirmRow: { flexDirection: "row", gap: 10 },
  choice: { flex: 1, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  choiceNo: { borderWidth: 1, borderColor: colors.stoneLine, backgroundColor: colors.paper },
  choiceYes: { backgroundColor: colors.ink },
  choiceNoText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
  choiceYesText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.white },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.stoneLine,
  },
  optionText: { flex: 1, fontFamily: fonts.serifMedium, fontSize: 14, color: colors.ink },
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
