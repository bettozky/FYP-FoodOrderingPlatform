import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../../shared/theme/theme";
import { useCall } from "../calls/CallContext";
import { ChatKind } from "./ChatPanel";
import { useChat } from "./ChatContext";

/** "Chat" and "Call" buttons for an order or booking, with an unread badge on Chat. */
export default function ChatButtons({ kind, id, allowCall = true, dark = false }: { kind: ChatKind; id: string; allowCall?: boolean; dark?: boolean }) {
  const { openChat, unreadFor } = useChat();
  const { startCall, inCall } = useCall();
  const n = unreadFor(kind, id);
  const fg = dark ? colors.white : colors.ink;
  return (
    <View style={styles.row}>
      <Pressable style={[styles.btn, dark && styles.btnDark]} onPress={() => openChat(kind, id)} testID="chat-open">
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={fg} />
        <Text style={[styles.label, { color: fg }]}>Chat</Text>
        {n > 0 && <View style={styles.badge} testID="chat-unread"><Text style={styles.badgeText}>{n}</Text></View>}
      </Pressable>
      {allowCall && (
        <Pressable style={[styles.btn, dark && styles.btnDark, inCall && { opacity: 0.4 }]} disabled={inCall} onPress={() => startCall(kind, id)} testID="call-open">
          <Ionicons name="call-outline" size={16} color={fg} />
          <Text style={[styles.label, { color: fg }]}>Call</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: "transparent" },
  btnDark: { borderColor: "#5A554B" },
  label: { fontSize: 14, fontFamily: fonts.displayBold },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.chili, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontFamily: fonts.displayExtraBold },
});
