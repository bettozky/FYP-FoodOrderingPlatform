import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, type ScrollViewInstance, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../shared/api/client";
import { colors, fonts, radius, spacing } from "../../shared/theme/theme";
import { useCall } from "../calls/CallContext";

export type ChatKind = "order" | "reservation";
type Msg = { seq: number; id: string; from: "customer" | "merchant" | "system"; text: string; at: number };

// Live chat for one order or reservation. Polls every 2 s (same stand-in for WebSocket as the rest of the app).
export default function ChatPanel({ kind, id, onClose, height }: { kind: ChatKind; id: string; onClose?: () => void; height?: number }) {
  const { startCall, inCall } = useCall();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [you, setYou] = useState<"customer" | "merchant" | null>(null);
  const [peer, setPeer] = useState("");
  const [open, setOpen] = useState(true);
  const [canCall, setCanCall] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const last = useRef(0);
  const list = useRef<ScrollViewInstance>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ you: "customer" | "merchant"; peerName: string; open: boolean; canCall: boolean; messages: Msg[] }>("GET", `/chat/${kind}/${id}?after=${last.current}`);
      setYou(r.you); setPeer(r.peerName); setOpen(r.open); setCanCall(r.canCall);
      if (r.messages.length) {
        last.current = Math.max(last.current, ...r.messages.map((m) => m.seq));
        setMessages((prev) => [...prev, ...r.messages.filter((m) => !prev.some((p) => p.seq === m.seq))]);
      }
    } catch { /* retry on next tick */ }
  }, [kind, id]);

  useEffect(() => {
    last.current = 0; setMessages([]);
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50); }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError("");
    try {
      await api("POST", `/chat/${kind}/${id}`, { text: body });
      setText("");
      await load();
    } catch (e) { setError(errorText(e)); } finally { setSending(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.wrap, height ? { height } : { flex: 1 }]} testID="chat-panel">
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{peer || "Chat"}</Text>
          <Text style={styles.sub}>{open ? "Live chat" : "This conversation is closed"}</Text>
        </View>
        {canCall && (
          <Pressable style={[styles.iconBtn, inCall && { opacity: 0.4 }]} disabled={inCall} onPress={() => startCall(kind, id)} testID="chat-call" accessibilityLabel="Call">
            <Ionicons name="call" size={18} color={colors.white} />
          </Pressable>
        )}
        {onClose && (
          <Pressable style={[styles.iconBtn, { backgroundColor: colors.paperDim }]} onPress={onClose} testID="chat-close" accessibilityLabel="Close chat">
            <Ionicons name="close" size={18} color={colors.ink} />
          </Pressable>
        )}
      </View>
      <ScrollView ref={list} contentContainerStyle={{ padding: spacing.md, gap: 8, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && <Text style={styles.empty}>No messages yet. Say hello, or ask about the order.</Text>}
        {messages.map((item) =>
          item.from === "system" ? (
            <Text key={item.seq} style={styles.system}>{item.text}</Text>
          ) : (
            <View key={item.seq} style={[styles.bubble, item.from === you ? styles.mine : styles.theirs]} testID={item.from === you ? "msg-mine" : "msg-theirs"}>
              <Text style={[styles.msgText, item.from === you && { color: colors.white }]}>{item.text}</Text>
              <Text style={[styles.time, item.from === you && { color: colors.textFaint }]}>{new Date(item.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          )
        )}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            placeholderTextColor={colors.textFaint}
            onSubmitEditing={send}
            returnKeyType="send"
            maxLength={500}
            testID="chat-input"
          />
          <Pressable style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]} onPress={send} disabled={!text.trim() || sending} testID="chat-send" accessibilityLabel="Send">
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.ink },
  sub: { fontSize: 12, fontFamily: fonts.serif, color: colors.stone },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.herb, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: colors.stone, fontFamily: fonts.serif, marginTop: spacing.xl, fontSize: 13 },
  system: { alignSelf: "center", color: colors.stone, fontFamily: fonts.display, fontSize: 12, backgroundColor: colors.paperDim, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden" },
  bubble: { maxWidth: "80%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 2 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.ink, borderBottomRightRadius: 4 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14.5, fontFamily: fonts.serifMedium, color: colors.ink },
  time: { fontSize: 10.5, fontFamily: fonts.serif, color: colors.textFaint, alignSelf: "flex-end" },
  error: { color: colors.chili, fontSize: 12, paddingHorizontal: spacing.md, fontFamily: fonts.display },
  inputRow: { flexDirection: "row", gap: 8, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9, fontFamily: fonts.serifMedium, fontSize: 14.5, color: colors.ink },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
});
