// Adds a dish the assistant recommended to the cart, safely: the price and stock are checked on the server
// first (GET /api/ai/dishes/:id). If the price changed since it was shown, the customer is asked again.
// Moved here from the old assistant screen so the voice mode and the chat share it.
import { useRef, useState } from "react";
import i18n from "i18next";
import { api } from "../../shared/api/client";
import { confirmAsync } from "../../shared/util/confirm";
import { useCart } from "../ordering/CartContext";
import type { Recommendation } from "./components/DishRecommendationCard";

export type AddResult = { added: boolean; message: string; dishName?: string };

export function useAddToCart() {
  const { addToCart } = useCart();
  const lock = useRef(false); // one add at a time
  const [adding, setAdding] = useState(false);

  /** shownPrice: the price the customer saw on the card (to warn if it changed). */
  async function addDish(dishId: string, shownPrice?: number): Promise<AddResult> {
    if (lock.current) return { added: false, message: i18n.t("ai.wait") };
    lock.current = true;
    setAdding(true);
    try {
      const fresh = await api<Recommendation>("GET", `/ai/dishes/${encodeURIComponent(dishId)}`);
      if (shownPrice !== undefined && fresh.dish.price !== shownPrice) {
        const ok = await confirmAsync(
          i18n.t("ai.priceChanged"),
          i18n.t("ai.priceNow", { price: fresh.dish.price.toFixed(2) }),
          i18n.t("ai.addToCart")
        );
        if (!ok) return { added: false, message: i18n.t("ai.notAdded") };
      }
      // The cart asks before switching restaurants.
      const added = await addToCart(fresh.dish, fresh.merchant, { qty: 1 });
      return added
        ? { added: true, message: i18n.t("ai.added", { name: fresh.dish.name }), dishName: fresh.dish.name }
        : { added: false, message: i18n.t("ai.notAdded") };
    } catch {
      return { added: false, message: i18n.t("ai.addFailed") };
    } finally {
      lock.current = false;
      setAdding(false);
    }
  }

  return { addDish, adding };
}
