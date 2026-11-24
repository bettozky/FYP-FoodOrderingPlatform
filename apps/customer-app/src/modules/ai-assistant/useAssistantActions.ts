// What happens when the customer answers the assistant: Yes / No questions, the "which order?" list, and
// opening a screen. Shared by voice mode and the chat sheet.
//   - Add to cart: Yes → re-check price and stock, add it, then ask "Open your cart?".
//   - Pay: Yes → close the assistant and open the Pay screen (the customer pays there themselves).
//   - Open cart: Yes → close the assistant and open the Cart.
//   - Order status: the tracking screen opens without asking (only looking).
import i18n from "i18next";
import type { ChatMessage, CustomerChat, Navigate } from "./useCustomerChat";
import { useAddToCart } from "./useAddToCart";

/** What the assistant says back after an answer (voice mode reads it out). */
export type Followup = { text: string; asksQuestion: boolean } | null;

export function useAssistantActions(chat: CustomerChat, navigation: any, close: () => void) {
  const { addDish, adding } = useAddToCart();

  /** Closes the assistant, then opens a screen (after the closing animation has started). */
  function openScreen(name: string, params?: object) {
    close();
    setTimeout(() => navigation?.navigate?.(name, params), 150);
  }

  async function answer(message: ChatMessage, yes: boolean): Promise<Followup> {
    const confirm = message.confirm;
    if (!confirm || message.confirmState !== "pending") return null;
    chat.answered(message.id, yes);

    if (!yes) {
      const text = i18n.t("ai.nothingChanged");
      chat.say(text);
      return { text, asksQuestion: false };
    }

    switch (confirm.kind) {
      case "add_to_cart": {
        const result = await addDish(confirm.dishId);
        if (!result.added) {
          chat.say(result.message, undefined, true);
          return { text: result.message, asksQuestion: false };
        }
        const text = i18n.t("ai.openCartAsk", { name: result.dishName });
        chat.say(text, { kind: "open_cart", summary: text });
        return { text, asksQuestion: true };
      }
      case "pay":
        openScreen("Pay", { orderId: confirm.orderId });
        return null;
      case "open_cart":
        openScreen("Cart");
        return null;
    }
  }

  /** "Which order do you want to pay?" → the tapped one opens on the Pay screen (tapping it is the confirmation). */
  function choose(message: ChatMessage, option: { orderId: string; label: string }) {
    if (message.choiceDone) return;
    chat.chose(message.id, option.label);
    openScreen("Pay", { orderId: option.orderId });
  }

  /** Order status: open its tracking screen. */
  function go(navigate: Navigate) {
    openScreen(navigate.screen, { orderId: navigate.orderId });
  }

  return { answer, choose, go, addDish, adding };
}

export type AssistantActions = ReturnType<typeof useAssistantActions>;
