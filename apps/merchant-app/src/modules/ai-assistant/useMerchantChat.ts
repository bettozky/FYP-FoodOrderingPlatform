// Chat state for the merchant assistant: the messages, a "waiting for a reply" flag, and send().
// Shared by voice mode and chat mode, so both show one conversation.
import { useRef, useState } from "react";
import { api, errorText } from "../../shared/api/client";

/** A chart under an answer. The server builds it from the stall's own orders. */
export type ChartCard = {
  type: "chart";
  kind: "today_by_hour" | "last_7_days" | "best_sellers_7_days";
  title: string;
  unit: "RM" | "sold";
  layout: "columns" | "rows";
  bars: { label: string; value: number }[];
  total: number;
};

export type ChatMessage = { id: string; from: "user" | "bot"; text: string; error?: boolean; card?: ChartCard | null };

/** What POST /api/ai/merchant/chat returns. */
export type AssistantReply = {
  reply: string; // shown on screen
  spoken?: string; // read aloud in voice mode (money in words, no symbols)
  language?: "en" | "ms" | "zh"; // which voice to use
  asksQuestion?: boolean; // voice mode listens again by itself when true
  card?: ChartCard | null; // a chart to show under the answer
};

let lastId = 0;
const newId = () => String(++lastId);

export function useMerchantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false); // blocks a second send while one is still waiting

  /** Sends a message. Returns the assistant's reply, or null if nothing was sent or it failed. */
  async function send(text: string): Promise<AssistantReply | null> {
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
      const res = await api<AssistantReply>("POST", "/ai/merchant/chat", { message, history });
      setMessages((prev) => [...prev, { id: newId(), from: "bot", text: res.reply, card: res.card ?? null }]);
      return res;
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

export type MerchantChat = ReturnType<typeof useMerchantChat>;