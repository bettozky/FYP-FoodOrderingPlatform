import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  type ScrollViewInstance,
  type TextInputInstance,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, type, fonts, shadow } from "../../../shared/theme/theme";
import { api } from "../../../shared/api/client";

import { useCart } from "../../ordering/CartContext";
import { confirmAsync } from "../../../shared/util/confirm";
import DishRecommendationCard, {
  type Recommendation,
} from "../components/DishRecommendationCard";
import { MAX_RECORDING_SECONDS, useSpeechToText } from "../useSpeechToText";
import i18n from "../../../shared/i18n";
import { useTranslation } from "react-i18next";


type Message = {
  id: string;
  from: "user" | "bot";
  text: string;
  recommendations?: Recommendation[];
};

// Quick questions, sent in the app's language (the assistant answers in the language it is asked in).
const SUGGESTIONS = ["ai.sugOrder", "ai.sugRefund", "ai.sugSpicy", "ai.sugHuman"] as const;

const INTRO: Message = {
  id: "intro",
  from: "bot",
  text: "", // shown with t("ai.intro") so it follows the language
};

function getFallbackReply(message: string): string {
  const text = message.toLowerCase().trim();

  // Randomly select an introduction to indicate that the AI is temporarily unavailable.
  const introductions = [
    i18n.t("ai.fbIntro1"),
    i18n.t("ai.fbIntro2"),
    i18n.t("ai.fbIntro3"),
  ];

  const intro =
    introductions[Math.floor(Math.random() * introductions.length)];

  let answer: string;

  // Basic fallback answers for common questions, in English, Malay, and Chinese.
  // IF the backend fails
  if (
    /opening hours|business hours|what time|open today|closing time|waktu operasi|waktu buka|pukul berapa|营业时间|几点开|几点关/.test(text)
  ) {
    answer =
      i18n.t("ai.fbHours");
  } else if (
    /pay|payment|bayar|pembayaran|付款|支付/.test(text)
  ) {
    answer =
      i18n.t("ai.fbPay");
  } else if (
    /where.*order|order status|track.*order|status pesanan|pesanan.*mana|订单状态|订单.*哪|追踪订单/.test(text)
  ) {
    answer =
      i18n.t("ai.fbStatus");
  } else if (
    /how.*order|place.*order|how.*cart|add.*cart|cara.*pesan|cara.*order|cara.*tempah|怎么下单|如何下单|怎么点餐|购物车/.test(text)
  ) {
    answer =
      i18n.t("ai.fbHowOrder");
  } else {
    answer =
      i18n.t("ai.fbOther");
  }

  return `${intro}\n\n${answer}\n\n${i18n.t("ai.fbRetry")}`;
}

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([INTRO]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const { addToCart } = useCart();

  // Voice input: the spoken words land in the message box so the customer can check or edit them before sending.
  const speech = useSpeechToText((text) => {
    setInput((previous) => (previous.trim() ? `${previous.trim()} ${text}` : text));
    requestAnimationFrame(() => inputRef.current?.focus());
  });
  const listening = speech.phase === "recording";
  const transcribing = speech.phase === "transcribing";
  const clock = `${Math.floor(speech.seconds / 60)}:${String(speech.seconds % 60).padStart(2, "0")}`;

  const cartLock = useRef(false);
  const [adding, setAdding] = useState(false);
  const [cardStatus, setCardStatus] = useState<Record<string, string>>({});

  async function send(text: string) {
  const trimmed = text.trim();

  if (!trimmed || typing) return;

  const userMsg: Message = {
    id: `u${Date.now()}`,
    from: "user",
    text: trimmed,
  };

  setMessages((previous) => [...previous, userMsg]);
  setInput("");
  setTyping(true);

  requestAnimationFrame(() =>
    scrollRef.current?.scrollToEnd({ animated: true })
  );

  try {
    // The existing API helper automatically sends the login token.
    // Menu, voucher, and order data are now read on the server.
    const data = await api<{
      reply: string;
      recommendations: Recommendation[];
    }>(
      "POST",
      "/ai/chat",
      {
        message: trimmed,
        history: messages
          .filter((message) => message.id !== "intro")
          .slice(-20)
          .map((message) => ({
            from: message.from,
            text: message.text,
          })),
      }
    );

    if (
      typeof data.reply !== "string" ||
      !data.reply.trim()
    ) {
      throw new Error("Invalid AI response");
    }

    const botMsg: Message = {
      id: `b${Date.now()}`,
      from: "bot",
      text: data.reply.trim(),
      recommendations: Array.isArray(data.recommendations)
        ? data.recommendations.slice(0, 6)
        : [],
    };

    setMessages((previous) => [...previous, botMsg]);
  } catch {
    console.warn("[AI Assistant] Showing local fallback.");

    const botMsg: Message = {
      id: `b${Date.now()}`,
      from: "bot",
      text: getFallbackReply(trimmed),
    };

    setMessages((previous) => [...previous, botMsg]);
  } finally {
    setTyping(false);

    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true })
    );
  }
}

async function addRecommendation(
  recommendation: Recommendation,
  cardKey: string
) {
  if (cartLock.current) return;

  cartLock.current = true;
  setAdding(true);

  setCardStatus((previous) => ({
    ...previous,
    [cardKey]: "",
  }));

  try {
    // Fetch current availability and price from the server.
    const fresh = await api<Recommendation>(
      "GET",
      `/ai/dishes/${encodeURIComponent(recommendation.dish.id)}`
    );

    if (fresh.dish.price !== recommendation.dish.price) {
      const accepted = await confirmAsync(
        i18n.t("ai.priceChanged"),
        i18n.t("ai.priceNow", { price: fresh.dish.price.toFixed(2) }),
        i18n.t("ai.addToCart")
      );

      if (!accepted) {
        setCardStatus((previous) => ({
          ...previous,
          [cardKey]: i18n.t("ai.notAdded"),
        }));
        return;
      }
    }

    // Existing cart logic asks before switching restaurants.
    const added = await addToCart(
      fresh.dish,
      fresh.merchant,
      { qty: 1 }
    );

    setCardStatus((previous) => ({
      ...previous,
      [cardKey]: added
        ? i18n.t("ai.added", { name: fresh.dish.name })
        : i18n.t("ai.notAdded"),
    }));
  } catch {
    setCardStatus((previous) => ({
      ...previous,
      [cardKey]:
        i18n.t("ai.addFailed"),
    }));
  } finally {
    cartLock.current = false;
    setAdding(false);
  }
}

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerAvatar}>
          <Ionicons name="sparkles" size={16} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>{t("tabs.assistant")}</Text>
          <Text style={styles.draftBadgeText}>{t("ai.poweredBy")}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubbleRow, m.from === "user" && styles.bubbleRowUser]}>
            {m.from === "bot" && (
              <View style={styles.botAvatar}>
                <Ionicons name="sparkles" size={12} color={colors.white} />
              </View>
            )}
            <View style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleBot, shadow.soft]}>
              <Text style={m.from === "user" ? styles.bubbleTextUser : styles.bubbleTextBot}>{m.id === "intro" ? t("ai.intro") : m.text}</Text>
              {m.from === "bot" &&
                m.recommendations?.map((recommendation) => {
                  const cardKey = `${m.id}:${recommendation.dish.id}`;

                  return (
                    <DishRecommendationCard
                      key={cardKey}
                      recommendation={recommendation}
                      disabled={adding}
                      status={cardStatus[cardKey]}
                      onAdd={(selected) => {
                        void addRecommendation(selected, cardKey);
                      }}
                    />
                  );
                })}
            </View>
          </View>
        ))}

        {typing && (
          <View style={styles.bubbleRow}>
            <View style={styles.botAvatar}>
              <Ionicons name="sparkles" size={12} color={colors.white} />
            </View>
            <View style={[styles.bubble, styles.bubbleBot, shadow.soft]}>
              <Text style={styles.bubbleTextBot}>···</Text>
            </View>
          </View>
        )}

        {messages.length <= 1 && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.suggestionChip} onPress={() => send(t(s))}>
                <Text style={styles.suggestionText}>{t(s)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

            {speech.error ? (
        <View style={styles.voiceErrorRow}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.chiliText} />
          <Text style={styles.voiceErrorText} accessibilityLiveRegion="polite">{speech.error}</Text>
          <Pressable onPress={speech.clearError} hitSlop={8} accessibilityLabel={t("ai.dismiss")} testID="ai-voice-error-close">
            <Ionicons name="close" size={15} color={colors.stoneText} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.inputBar}>
        {listening || transcribing ? (
          <View style={[styles.input, styles.voicePill]} accessibilityLiveRegion="polite">
            {listening ? (
              <>
                <View style={styles.recDot} />
                <Text style={styles.voicePillText} numberOfLines={1}>
                  {t("ai.listening", { time: clock })}
                  <Text style={styles.voicePillHint}>
                    {speech.seconds >= MAX_RECORDING_SECONDS - 10 ? `  ${t("ai.stopsAt")}` : `  ${t("ai.tapStop")}`}
                  </Text>
                </Text>
                <Pressable onPress={() => void speech.cancel()} hitSlop={8} accessibilityLabel={t("ai.cancelRec")} testID="ai-mic-cancel">
                  <Ionicons name="close-circle" size={20} color={colors.stone} />
                </Pressable>
              </>
            ) : (
              <>
                <ActivityIndicator size="small" color={colors.turmericDeep} />
                <Text style={styles.voicePillText}>{t("ai.transcribing")}</Text>
              </>
            )}
          </View>
        ) : (
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t("ai.placeholder")}
            placeholderTextColor={colors.textFaint}
            value={input}
            onChangeText={(text) => {
              setInput(text);
              if (speech.error) speech.clearError();
            }}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
        )}

        <Pressable
          style={[styles.micBtn, listening && styles.micBtnActive, transcribing && { opacity: 0.4 }]}
          disabled={transcribing}
          onPress={() => void (listening ? speech.stop() : speech.start())}
          accessibilityRole="button"
          accessibilityLabel={listening ? t("ai.stopRec") : t("ai.speak")}
          testID="ai-mic"
        >
          <Ionicons name={listening ? "stop" : "mic"} size={18} color={listening ? colors.white : colors.ink} />
        </Pressable>

        {!listening && !transcribing && (
          <Pressable
            style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
            disabled={!input.trim()}
            onPress={() => send(input)}
            accessibilityRole="button"
            accessibilityLabel={t("chat.send")}
          >
            <Ionicons name="arrow-up" size={18} color={colors.white} />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.herb,
    alignItems: "center",
    justifyContent: "center",
  },
  draftBadgeText: { fontFamily: fonts.display, fontSize: 11, color: colors.stone, marginTop: 1 },
  messages: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, maxWidth: "90%" },
  bubbleRowUser: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  botAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.herb,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.lg, maxWidth: "100%" },
  bubbleBot: { backgroundColor: colors.paper, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.turmeric, borderBottomRightRadius: 4 },
  bubbleTextBot: { fontFamily: fonts.serif, fontSize: 14.5, color: colors.ink, lineHeight: 20 },
  bubbleTextUser: { fontFamily: fonts.serif, fontSize: 14.5, color: colors.white, lineHeight: 20 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  suggestionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  suggestionText: { fontFamily: fonts.display, fontSize: 12.5, color: colors.turmericDeep },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontFamily: fonts.serif,
    fontSize: 14.5,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.turmeric,
    alignItems: "center",
    justifyContent: "center",
  },
    micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: { backgroundColor: colors.chili, borderColor: colors.chili },
  voicePill: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.chili },
  voicePillText: { flex: 1, fontFamily: fonts.serifMedium, fontSize: 14, color: colors.ink },
  voicePillHint: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.stoneText },
  voiceErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.chiliSoft,
  },
  voiceErrorText: { flex: 1, fontFamily: fonts.serif, fontSize: 12.5, color: colors.chiliText, lineHeight: 17 },
});
