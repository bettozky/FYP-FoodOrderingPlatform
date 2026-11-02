import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../shared/api/client";
import { useAuth } from "../auth/AuthContext";

// Saved ("favourite") dishes, shared by every heart button in the app.
// They are kept on the server (GET/PUT/DELETE /api/favourites), so they survive logout, closing the app and a new phone.
// The heart changes straight away; if the server says no, it flips back.
type FavouritesValue = {
  ids: string[];
  isFav: (dishId: string) => boolean;
  toggle: (dishId: string) => void;
  /** Saved stalls (shops). */
  shopIds: string[];
  isFavShop: (merchantId: string) => boolean;
  toggleShop: (merchantId: string) => void;
};

const FavouritesContext = createContext<FavouritesValue | undefined>(undefined);

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [ids, setIds] = useState<string[]>([]);
  const [shopIds, setShopIds] = useState<string[]>([]);
  const current = useRef<string | null>(null);
  current.current = userId;

  useEffect(() => {
    setIds([]);
    setShopIds([]);
    if (!userId) return;
    let alive = true;
    api<{ dishIds?: string[]; merchantIds?: string[] }>("GET", "/favourites")
      .then((r) => {
        if (!alive || current.current !== userId) return;
        setIds(Array.isArray(r.dishIds) ? r.dishIds : []);
        setShopIds(Array.isArray(r.merchantIds) ? r.merchantIds : []);
      })
      .catch(() => {}); // offline: start empty, hearts still work and sync when the server answers
    return () => { alive = false; };
  }, [userId]);

  const idsRef = useRef<string[]>([]);
  idsRef.current = ids;
  const shopRef = useRef<string[]>([]);
  shopRef.current = shopIds;

  // Same logic for dishes and stalls: change the heart now, tell the server, put it back if the server says no.
  const flip = useCallback((kind: "dishes" | "merchants", id: string) => {
    const list = kind === "dishes" ? idsRef : shopRef;
    const set = kind === "dishes" ? setIds : setShopIds;
    const adding = !list.current.includes(id);
    set((prev) => (adding ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
    api(adding ? "PUT" : "DELETE", `/favourites/${kind}/${id}`).catch(() => {
      set((prev) => (adding ? prev.filter((x) => x !== id) : prev.includes(id) ? prev : [...prev, id]));
    });
  }, []);
  const toggle = useCallback((id: string) => flip("dishes", id), [flip]);
  const toggleShop = useCallback((id: string) => flip("merchants", id), [flip]);

  const value = useMemo<FavouritesValue>(
    () => ({ ids, isFav: (id) => ids.includes(id), toggle, shopIds, isFavShop: (id) => shopIds.includes(id), toggleShop }),
    [ids, toggle, shopIds, toggleShop],
  );
  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites() {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be used within FavouritesProvider");
  return ctx;
}
