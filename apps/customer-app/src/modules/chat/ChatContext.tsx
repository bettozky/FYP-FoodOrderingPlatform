import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Modal, Platform, StyleSheet, View } from "react-native";
import { api } from "../../shared/api/client";
import { colors, spacing } from "../../shared/theme/theme";
import { useAuth } from "../auth/AuthContext";
import ChatPanel, { ChatKind } from "./ChatPanel";

// Unread counts for every conversation (polled), plus one chat sheet any screen can open.
type ChatValue = {
  unread: Record<string, number>;
  unreadFor: (kind: ChatKind, id: string) => number;
  openChat: (kind: ChatKind, id: string) => void;
};

const ChatContext = createContext<ChatValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [sheet, setSheet] = useState<{ kind: ChatKind; id: string } | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { setUnread({}); setSheet(null); return; }
    let stop = false;
    const run = () => api<{ unread: Record<string, number> }>("GET", "/chat/unread").then((r) => { if (!stop) setUnread(r.unread); }).catch(() => {});
    run();
    const t = setInterval(run, 2500);
    return () => { stop = true; clearInterval(t); };
  }, [isLoggedIn]);

  const unreadFor = useCallback((kind: ChatKind, id: string) => unread[`${kind}:${id}`] ?? 0, [unread]);
  const openChat = useCallback((kind: ChatKind, id: string) => setSheet({ kind, id }), []);

  return (
    <ChatContext.Provider value={{ unread, unreadFor, openChat }}>
      {children}
      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>{sheet && <ChatPanel kind={sheet.kind} id={sheet.id} onClose={() => setSheet(null)} />}</View>
        </View>
      </Modal>
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 560, height: "78%", padding: spacing.sm, paddingBottom: Platform.OS === "ios" ? 24 : spacing.sm },
});
