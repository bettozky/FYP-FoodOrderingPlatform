import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../../shared/api/client";
import { MerchantProfile, Order, Reservation } from "../../shared/api/types";
import { useAuth } from "../auth/AuthContext";

// Polls the backend every 2 s. This stands in for push / WebSocket until those are added; the pop-ups
// still reach the app within the 5 s target (NFR-2) and every countdown is based on SERVER time.
type LiveValue = {
  orders: Order[];
  reservations: Reservation[];
  profile: MerchantProfile | null;
  refresh: () => Promise<void>;
};
const LiveContext = createContext<LiveValue | undefined>(undefined);
const POLL_MS = 2000;

export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, approval } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const me = await api<{ merchant: MerchantProfile }>("GET", "/merchant/me");
      setProfile(me.merchant);
      if (me.merchant.approval === "approved") {
        const [o, r] = await Promise.all([
          api<{ orders: Order[] }>("GET", "/merchant/orders"),
          api<{ reservations: Reservation[] }>("GET", "/merchant/reservations"),
        ]);
        setOrders(o.orders);
        setReservations(r.reservations);
      }
    } catch {
      /* try again next tick */
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || approval !== "approved") {
      setOrders([]);
      setReservations([]);
      if (!isLoggedIn) setProfile(null);
      return;
    }
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [isLoggedIn, approval, refresh]);

  return <LiveContext.Provider value={{ orders, reservations, profile, refresh }}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within LiveDataProvider");
  return ctx;
}
