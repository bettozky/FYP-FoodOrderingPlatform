import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, type, fonts, shadow } from "../../theme/theme";

import {
  merchants,
  dishes,
  activeOrder,
  orderHistory,
  loyalty,
  vouchers,
} from "../../data/mockData";

const API_URL = "http://localhost:3001";

// Frontend draft of the ScootMeal AI assistant. Replies are canned/keyword
// matched for now so the interaction and layout can be reviewed before any
// real model is wired up — swap `craftReply` for a real API call later and
// nothing else here needs to change.

type Message = { id: string; from: "user" | "bot"; text: string };

const SUGGESTIONS = ["Where's my order?", "I want a refund", "Recommend something spicy", "Talk to a human"];

const INTRO: Message = {
  id: "intro",
  from: "bot",
  text: "Hi, I'm the ScootMeal Assistant 👋 Ask me about your order, a dish, or an account issue.",
};



export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([INTRO]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function send(text: string) {
  const trimmed = text.trim();

  if (!trimmed || typing) return;

  const userMsg: Message = {
    id: `u${Date.now()}`,
    from: "user",
    text: trimmed,
  };

  setMessages((m) => [...m, userMsg]);
  setInput("");
  setTyping(true);

  requestAnimationFrame(() =>
    scrollRef.current?.scrollToEnd({ animated: true })
  );

  try {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: trimmed,
        history: messages,
        context: {
          merchants,
          dishes,
          activeOrder,
          orderHistory,
          loyalty,
          vouchers,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("AI request failed");
    }

    const data = await response.json();

    const botMsg: Message = {
      id: `b${Date.now()}`,
      from: "bot",
      text: data.reply,
    };

    setMessages((m) => [...m, botMsg]);
  } catch (error) {
    console.error(error);

    const botMsg: Message = {
      id: `b${Date.now()}`,
      from: "bot",
      text: "Sorry, I couldn't connect to the ScootMeal AI service. Please try again.",
    };

    setMessages((m) => [...m, botMsg]);
  } finally {
    setTyping(false);

    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true })
    );
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
          <Text style={type.h2}>Assistant</Text>
          <Text style={styles.draftBadgeText}>AI powered by OpenAI</Text>
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
              <Text style={m.from === "user" ? styles.bubbleTextUser : styles.bubbleTextBot}>{m.text}</Text>
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
              <Pressable key={s} style={styles.suggestionChip} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask the assistant…"
          placeholderTextColor={colors.textFaint}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
          disabled={!input.trim()}
          onPress={() => send(input)}
        >
          <Ionicons name="arrow-up" size={18} color={colors.white} />
        </Pressable>
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
});
