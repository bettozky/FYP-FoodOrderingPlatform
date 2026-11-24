// Chat state for the merchant assistant: the messages, a "waiting" flag, send(), and answer() for Yes / No.
// Shared by voice mode and chat mode, so both show one conversation.
import { useRef, useState } from "react";
import { api, ApiError, errorText } from "../../shared/api/client";

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

/** A change the assistant proposed (sold out, busy mode, deal). Nothing happens until the merchant says Yes. */
export type ConfirmCard = { id: string; summary: string; expiresAt: number };
export type ConfirmState = "pending" | "done" | "cancelled" | "expired" | "failed";

export type ChatMessage = {
  id: string;
  from: "user" | "bot";
  text: string;
  error?: boolean;
  card?: ChartCard | null;
  confirm?: ConfirmCard | null;
  confirmState?: ConfirmState;
};

/** What POST /api/ai/merchant/chat returns. */
export type AssistantReply = {
  reply: string; // shown on screen
  spoken?: string; // read aloud in voice mode (money in words, no symbols)
  language?: "en" | "ms" | "zh"; // which voice to use
  asksQuestion?: boolean; // voice mode listens again by itself when true
  card?: ChartCard | null; // a chart to show under the answer
  confirm?: ConfirmCard | null; // a proposed change waiting for Yes or No
};

/** What POST /api/ai/merchant/actions/:id returns. */
type ActionResult = { status: "done" | "cancelled" | "failed"; reply: string; spoken: string; language: "en" | "ms" | "zh" };

let lastId = 0;
const newId = () => String(++lastId);

export function useMerchantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false); // blocks a second request while one is still waiting

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

    // A new question replaces any proposal still waiting for an answer.
    setMessages((prev) => [
      ...prev.map((m) => (m.confirmState === "pending" ? { ...m, confirmState: "expired" as const } : m)),
      { id: newId(), from: "user", text: message },
    ]);
    setLoading(true);

    try {
      const res = await api<AssistantReply>("POST", "/ai/merchant/chat", { message, history });
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          from: "bot",
          text: res.reply,
          card: res.card ?? null,
          confirm: res.confirm ?? null,
          confirmState: res.confirm ? "pending" : undefined,
        },
      ]);
      return res;
    } catch (e) {
      setMessages((prev) => [...prev, { id: newId(), from: "bot", text: errorText(e), error: true }]);
      return null;
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  /** Answers a proposal with Yes or No. Returns what the assistant says back, or null if nothing was sent. */
  async function answer(messageId: string, yes: boolean): Promise<{ reply: string; spoken: string; language: "en" | "ms" | "zh" } | null> {
    const target = messages.find((m) => m.id === messageId);
    if (!target?.confirm || target.confirmState !== "pending" || busy.current) return null;
    busy.current = true;
    setLoading(true);
    // Show the merchant's answer in the conversation (and in the voice card).
    setMessages((prev) => [...prev, { id: newId(), from: "user", text: yes ? "Yes" : "No" }]);

    const mark = (state: ConfirmState) =>
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, confirmState: state } : m)));

    try {
      const res = await api<ActionResult>("POST", `/ai/merchant/actions/${target.confirm.id}`, { answer: yes ? "yes" : "no" });
      mark(res.status);
      setMessages((prev) => [...prev, { id: newId(), from: "bot", text: res.reply, error: res.status === "failed" }]);
      return res;
    } catch (e) {
      // 410 = the proposal ran out of time (2 minutes) or was already answered.
      mark(e instanceof ApiError && e.status === 410 ? "expired" : "failed");
      const text = errorText(e);
      setMessages((prev) => [...prev, { id: newId(), from: "bot", text, error: true }]);
      return { reply: text, spoken: text, language: "en" };
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  const clear = () => setMessages([]);

  /** The latest proposal still waiting for Yes or No, if any. */
  const pending = [...messages].reverse().find((m) => m.confirmState === "pending");

  return { messages, loading, send, answer, pending, clear };
}

export type MerchantChat = ReturnType<typeof useMerchantChat>;
