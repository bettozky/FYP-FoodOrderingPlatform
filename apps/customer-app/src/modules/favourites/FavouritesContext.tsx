import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

// Saved ("favourite") dishes, shared by every heart button in the app.
// Kept in memory for now: it survives navigating around, but is cleared on logout and when the
// app is closed. Persisting it (e.g. AsyncStorage, or a backend endpoint) is the next step.
type FavouritesValue = {
  ids: string[];
  isFav: (dishId: string) => boolean;
  toggle: (dishId: string) => void;
};

const FavouritesContext = createContext<FavouritesValue | undefined>(undefined);

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoggedIn) setIds([]);
  }, [isLoggedIn]);

  const toggle = useCallback((dishId: string) => {
    setIds((prev) => (prev.includes(dishId) ? prev.filter((x) => x !== dishId) : [...prev, dishId]));
  }, []);

  const value = useMemo<FavouritesValue>(() => ({ ids, isFav: (id) => ids.includes(id), toggle }), [ids, toggle]);
  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites() {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be used within FavouritesProvider");
  return ctx;
}
