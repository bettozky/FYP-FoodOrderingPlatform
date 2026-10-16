import React, { createContext, useContext, useMemo, useState } from "react";
import { Dish, Merchant, Mode } from "../../shared/api/types";
import { confirmAsync } from "../../shared/util/confirm";

// One cart = one restaurant. Every dish carries its own quantity per fulfilment mode, so a single
// order can mix dine-in, takeaway and delivery items and still be paid in one go (FR-2.2, FR-2.3).
export type CartLine = {
  key: string;
  dish: Dish;
  options: string[];
  qty: Record<Mode, number>;
};

const emptyQty = (): Record<Mode, number> => ({ delivery: 0, dine_in: 0, takeaway: 0 });
const totalQty = (q: Record<Mode, number>) => q.delivery + q.dine_in + q.takeaway;

type CartContextValue = {
  lines: CartLine[];
  merchant: Merchant | null;
  lastMode: Mode;
  /** Adds to the cart. If the cart holds another restaurant's food, asks first. Returns false if cancelled. */
  addToCart: (dish: Dish, merchant: Merchant, opts?: { mode?: Mode; qty?: number; options?: string[] }) => Promise<boolean>;
  setLineQty: (key: string, mode: Mode, qty: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  hasDelivery: boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [lastMode, setLastMode] = useState<Mode>("delivery");

  const insert = (dish: Dish, m: Merchant, base: CartLine[], mode: Mode, qty: number, options: string[]) => {
    const key = `${dish.id}|${[...options].sort().join(",")}`;
    const existing = base.find((l) => l.key === key);
    if (existing) return base.map((l) => (l.key === key ? { ...l, dish, qty: { ...l.qty, [mode]: l.qty[mode] + qty } } : l));
    return [...base, { key, dish, options, qty: { ...emptyQty(), [mode]: qty } }];
  };

  const addToCart: CartContextValue["addToCart"] = async (dish, m, opts = {}) => {
    let mode: Mode = opts.mode ?? (m.dineInOnly ? "dine_in" : lastMode);
    if (m.dineInOnly) mode = "dine_in";
    let base = lines;
    if (merchant && merchant.id !== m.id && lines.length > 0) {
      const ok = await confirmAsync("Start a new cart?", `Your cart has food from ${merchant.name}. Clear it and add from ${m.name}? One order can only be from one restaurant.`, "Start new cart");
      if (!ok) return false;
      base = [];
    }
    setMerchant(m);
    setLastMode(mode);
    setLines(insert(dish, m, base, mode, opts.qty ?? 1, opts.options ?? []));
    return true;
  };

  const setLineQty = (key: string, mode: Mode, qty: number) =>
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: { ...l.qty, [mode]: Math.max(0, Math.min(20, qty)) } } : l))
        .filter((l) => totalQty(l.qty) > 0)
    );

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));
  const clearCart = () => {
    setLines([]);
    setMerchant(null);
  };

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.dish.price * totalQty(l.qty), 0), [lines]);
  const itemCount = useMemo(() => lines.reduce((s, l) => s + totalQty(l.qty), 0), [lines]);
  const hasDelivery = useMemo(() => lines.some((l) => l.qty.delivery > 0), [lines]);

  return (
    <CartContext.Provider
      value={{ lines: lines.length ? lines : [], merchant: lines.length ? merchant : null, lastMode, addToCart, setLineQty, removeLine, clearCart, subtotal, itemCount, hasDelivery }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const lineTotalQty = totalQty;

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
