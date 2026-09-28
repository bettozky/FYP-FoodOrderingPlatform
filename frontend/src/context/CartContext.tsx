import React, { createContext, useContext, useMemo, useState } from "react";
import { Dish } from "../data/mockData";

export type CartLine = { dish: Dish; qty: number };

type CartContextValue = {
  lines: CartLine[];
  addToCart: (dish: Dish) => void;
  removeLine: (dishId: string) => void;
  incrementLine: (dishId: string) => void;
  decrementLine: (dishId: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addToCart = (dish: Dish) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.dish.id === dish.id);
      if (existing) {
        return prev.map((l) => (l.dish.id === dish.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { dish, qty: 1 }];
    });
  };

  const removeLine = (dishId: string) => setLines((prev) => prev.filter((l) => l.dish.id !== dishId));

  const incrementLine = (dishId: string) =>
    setLines((prev) => prev.map((l) => (l.dish.id === dishId ? { ...l, qty: l.qty + 1 } : l)));

  const decrementLine = (dishId: string) =>
    setLines((prev) =>
      prev
        .map((l) => (l.dish.id === dishId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0)
    );

  const clearCart = () => setLines([]);

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.dish.price * l.qty, 0), [lines]);
  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.qty, 0), [lines]);

  return (
    <CartContext.Provider
      value={{ lines, addToCart, removeLine, incrementLine, decrementLine, clearCart, subtotal, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
