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
  const inflight = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
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
    }
  }, []);

  // A manual refresh (e.g. right after Confirm) waits for any poll already running and then loads fresh data,
  // so the pop-up closes straight away instead of showing the old order for another 2 s.
  const refresh = useCallback(async () => {
    if (inflight.current) await inflight.current;
    const p = load();
    inflight.current = p;
    try { await p; } finally { if (inflight.current === p) inflight.current = null; }
  }, [load]);

  useEffect(() => {
    if (!isLoggedIn || approval !== "approved") {
      setOrders([]);
      setReservations([]);
      if (!isLoggedIn) setProfile(null);
      return;
    }
    refresh();
    const t = setInterval(() => { if (!inflight.current) refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [isLoggedIn, approval, refresh]);

  return <LiveContext.Provider value={{ orders, reservations, profile, refresh }}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within LiveDataProvider");
  return ctx;
}
