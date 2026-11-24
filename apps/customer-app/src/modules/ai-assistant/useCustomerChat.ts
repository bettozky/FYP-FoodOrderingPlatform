// Chat state for the customer assistant, shared by voice mode and the chat sheet (one conversation).
// send() asks POST /api/ai/chat. The server can attach dish cards, a Yes / No question (add to cart, open
// payment), a screen to open (order tracking) or a list to pick from (which order to pay).
import { useRef, useState } from "react";
import i18n from "i18next";
import { api } from "../../shared/api/client";
import type { Recommendation } from "./components/DishRecommendationCard";

export type Lang = "en" | "ms" | "zh";

/** A Yes / No question. "open_cart" is asked by the app itself after adding a dish. */
export type Confirm =
  | { kind: "add_to_cart"; summary: string; dishId: string }
  | { kind: "pay"; summary: string; orderId: string }
  | { kind: "open_cart"; summary: string };
export type Navigate = { screen: "OrderTracking"; orderId: string };
export type Choices = { kind: "pay"; question: string; options: { orderId: string; label: string }[] };
export type ConfirmState = "pending" | "yes" | "no" | "expired";

export type ChatMessage = {
  id: string;
  from: "user" | "bot";
  text: string;
  error?: boolean;
  recommendations?: Recommendation[];
  confirm?: Confirm | null;
  confirmState?: ConfirmState;
  navigate?: Navigate | null;
  choices?: Choices | null;
  choiceDone?: boolean;
};

/** What POST /api/ai/chat returns. */
export type AssistantReply = {
  reply: string;
  spoken?: string;
  language?: Lang;
  asksQuestion?: boolean;
  recommendations?: Recommendation[];
  confirm?: Confirm | null;
  navigate?: Navigate | null;
  choices?: Choices | null;
};

let lastId = 0;
const newId = () => `m${++lastId}`;

/** Shown when the server can't be reached at all (the server has its own fallback when only the AI is down). */
function offlineReply(message: string): string {
  const text = message.toLowerCase().trim();
  const intros = [i18n.t("ai.fbIntro1"), i18n.t("ai.fbIntro2"), i18n.t("ai.fbIntro3")];
  const intro = intros[Math.floor(Math.random() * intros.length)];
  let answer: string;
  if (/opening hours|business hours|what time|open today|closing time|waktu operasi|waktu buka|pukul berapa|营业时间|几点开|几点关/.test(text)) answer = i18n.t("ai.fbHours");
  else if (/pay|payment|bayar|pembayaran|付款|支付/.test(text)) answer = i18n.t("ai.fbPay");
  else if (/where.*order|order status|track.*order|status pesanan|pesanan.*mana|订单状态|订单.*哪|追踪订单/.test(text)) answer = i18n.t("ai.fbStatus");
  else if (/how.*order|place.*order|how.*cart|add.*cart|cara.*pesan|cara.*order|cara.*tempah|怎么下单|如何下单|怎么点餐|购物车/.test(text)) answer = i18n.t("ai.fbHowOrder");
  else answer = i18n.t("ai.fbOther");
  return `${intro}\n\n${answer}\n\n${i18n.t("ai.fbRetry")}`;
}

export function useCustomerChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false); // one request at a time

  /** Sends a message. Returns the reply (or a local fallback), or null if nothing was sent. */
  async function send(text: string): Promise<AssistantReply | null> {
    const message = text.trim();
    if (!message || busy.current) return null;
    busy.current = true;

    const history = messages
      .filter((m) => !m.error)
      .slice(-20)
      .map(({ from, text }) => ({ from, text }));

    // A new question replaces any Yes / No still waiting.
    setMessages((prev) => [
      ...prev.map((m) => (m.confirmState === "pending" ? { ...m, confirmState: "expired" as const } : m)),
      { id: newId(), from: "user", text: message },
    ]);
    setLoading(true);

    try {
      const res = await api<AssistantReply>("POST", "/ai/chat", { message, history });
      if (typeof res.reply !== "string" || !res.reply.trim()) throw new Error("Invalid AI response");
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          from: "bot",
          text: res.reply.trim(),
          recommendations: Array.isArray(res.recommendations) ? res.recommendations.slice(0, 6) : [],
          confirm: res.confirm ?? null,
          confirmState: res.confirm ? "pending" : undefined,
          navigate: res.navigate ?? null,
          choices: res.choices ?? null,
        },
      ]);
      return res;
    } catch {
      console.warn("[AI Assistant] Showing local fallback.");
      const reply = offlineReply(message);
      setMessages((prev) => [...prev, { id: newId(), from: "bot", text: reply }]);
      return { reply, spoken: reply, language: "en" };
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  /** Records the answer to a Yes / No question, and shows "Yes" / "No" as the customer's message. */
  function answered(messageId: string, yes: boolean) {
    setMessages((prev) => [
      ...prev.map((m) => (m.id === messageId ? { ...m, confirmState: (yes ? "yes" : "no") as ConfirmState } : m)),
      { id: newId(), from: "user", text: yes ? i18n.t("ai.yes") : i18n.t("ai.no") },
    ]);
  }

  /** Marks a "which order?" list as used. */
  function chose(messageId: string, label: string) {
    setMessages((prev) => [
      ...prev.map((m) => (m.id === messageId ? { ...m, choiceDone: true } : m)),
      { id: newId(), from: "user", text: label },
    ]);
  }

  /** Adds a message from the assistant written by the app (for example "Added. Open your cart?"). */
  function say(text: string, confirm?: Confirm, error?: boolean) {
    setMessages((prev) => [
      ...prev,
      { id: newId(), from: "bot", text, error, confirm: confirm ?? null, confirmState: confirm ? "pending" : undefined },
    ]);
  }

  const clear = () => setMessages([]);

  /** The latest Yes / No still waiting for an answer, if any. */
  const pending = [...messages].reverse().find((m) => m.confirmState === "pending");

  return { messages, loading, send, answered, chose, say, pending, clear };
}

export type CustomerChat = ReturnType<typeof useCustomerChat>;
