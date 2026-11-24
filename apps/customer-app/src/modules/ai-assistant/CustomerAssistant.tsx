// The customer assistant, opened by the ✨ button in the bottom bar (MainTabs.tsx).
// It opens in VOICE mode (Siri-like); the 💬 button switches to the CHAT sheet. Both share one conversation and
// live inside one Modal, because iPhones cannot reliably show a second Modal while the first one is closing.
// Same design as the merchant app's assistant.
import React, { useEffect, useRef, useState } from "react";
import { Modal } from "react-native";
import ChatSheet from "./ChatSheet";
import VoiceOverlay from "./VoiceOverlay";
import { useAssistantActions } from "./useAssistantActions";
import { useCustomerChat } from "./useCustomerChat";

type Props = { visible: boolean; onClose: () => void; navigation: any };
type Mode = "voice" | "chat";

const CLOSE_MS = 260; // longest closing animation of the two modes

export default function CustomerAssistant({ visible, onClose, navigation }: Props) {
  const chat = useCustomerChat();
  const actions = useAssistantActions(chat, navigation, onClose);
  const [mode, setMode] = useState<Mode>("voice");

  // `shown` keeps the Modal on screen while the closing animation plays.
  const [shown, setShown] = useState(visible);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (visible) {
      setMode("voice"); // every opening starts in voice mode
      setShown(true);
    } else {
      hideTimer.current = setTimeout(() => setShown(false), CLOSE_MS);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [visible]);

  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={onClose}>
      <VoiceOverlay
        active={visible && mode === "voice"}
        chat={chat}
        actions={actions}
        onClose={onClose}
        onOpenChat={() => setMode("chat")}
      />
      <ChatSheet active={visible && mode === "chat"} chat={chat} actions={actions} onClose={onClose} />
    </Modal>
  );
}
