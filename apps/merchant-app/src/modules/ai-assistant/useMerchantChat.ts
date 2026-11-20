// Chat state for the merchant assistant: the messages, a "waiting for a reply" flag, and send().
// Kept separate from the screen so the voice mode (later step) can reuse the same chat.
import { useRef, useState } from "react";
import { api, errorText } from "../../shared/api/client";

export type ChatMessage = { id: string; from: "user" | "bot"; text: string; error?: boolean };

let lastId = 0;
const newId = () => String(++lastId);

export function useMerchantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false); // blocks a second send while one is still waiting

  /** Sends a message. Returns the reply text, or null if nothing was sent or it failed. */
  async function send(text: string): Promise<string | null> {
    const message = text.trim();
    if (!message || busy.current) return null;
    busy.current = true;

    // Earlier messages give the AI context. Error bubbles are left out; the server keeps the last 20.
    const history = messages
      .filter((m) => !m.error)
      .slice(-20)
      .map(({ from, text }) => ({ from, text }));

    setMessages((prev) => [...prev, { id: newId(), from: "user", text: message }]);
    setLoading(true);

    try {
      const res = await api<{ reply: string }>("POST", "/ai/merchant/chat", { message, history });
      setMessages((prev) => [...prev, { id: newId(), from: "bot", text: res.reply }]);
      return res.reply;
    } catch (e) {
      setMessages((prev) => [...prev, { id: newId(), from: "bot", text: errorText(e), error: true }]);
      return null;
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  const clear = () => setMessages([]);

  return { messages, loading, send, clear };
}