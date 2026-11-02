import { useCallback, useState } from "react";
import { api, errorText } from "../../shared/api/client";
import { Dish, Order } from "../../shared/api/types";
import { alertAsync } from "../../shared/util/confirm";
import { useCatalog } from "../discovery/CatalogContext";
import { useCart } from "./CartContext";

/**
 * "Order again": puts the dishes of an earlier order back in the cart using today's menu and prices.
 * Dishes that are sold out or no longer sold are skipped and the customer is told which ones.
 * Options (e.g. "no chilli") are kept only if the dish still offers them.
 */
export function useReorder(navigation: any) {
  const { merchantById } = useCatalog();
  const { addToCart, clearCart } = useCart();
  const [busyId, setBusyId] = useState("");

  const reorder = useCallback(async (order: Order) => {
    const shop = merchantById[order.merchantId];
    if (!shop) return alertAsync("Stall not available", `${order.merchantName} is not on ScootMeal right now.`);
    setBusyId(order.id);
    try {
      const { dishes } = await api<{ dishes: Dish[] }>("GET", `/dishes?merchantId=${encodeURIComponent(order.merchantId)}`);
      const byId = new Map(dishes.map((d) => [d.id, d]));
      const skipped: string[] = [];
      // Only what the customer actually received/ordered: skip lines the stall cancelled or ran out of.
      const wanted = order.items.filter((i) => i.status !== "out_of_stock" && i.status !== "cancelled");
      const lines = (wanted.length ? wanted : order.items).filter((i) => {
        const d = byId.get(i.dishId);
        if (!d || d.soldOut) { skipped.push(i.name); return false; }
        return true;
      });
      if (!lines.length) return alertAsync("Nothing to add", "None of these dishes are available right now.");
      let first = true;
      for (const i of lines) {
        const d = byId.get(i.dishId)!;
        const options = i.options.filter((o) => d.customisations.includes(o));
        const ok = await addToCart(d, shop, { mode: shop.dineInOnly ? "dine_in" : i.mode, qty: i.qty, options });
        if (!ok) { if (first) return; break; } // customer said no to replacing their cart
        first = false;
      }
      if (skipped.length) await alertAsync("Some dishes were left out", `${[...new Set(skipped)].join(", ")} ${skipped.length === 1 ? "is" : "are"} not available right now.`);
      navigation.navigate("Cart");
    } catch (e) {
      await alertAsync("Could not reorder", errorText(e));
    } finally {
      setBusyId("");
    }
  }, [merchantById, addToCart, clearCart, navigation]);

  return { reorder, busyId };
}
