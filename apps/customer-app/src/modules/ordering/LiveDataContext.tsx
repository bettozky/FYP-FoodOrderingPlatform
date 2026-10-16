import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../../shared/api/client";
import { AppNotification, Order, Reservation } from "../../shared/api/types";
import { useAuth } from "../auth/AuthContext";

// Polls the backend every 2 s for orders, reservations and notifications. This is the prototype's
// stand-in for WebSocket / push (FR-2.5, FR-2.7, FR-3.4); the server owns every timer (NFR-2).
type LiveValue = {
  orders: Order[];
  reservations: Reservation[];
  notifications: AppNotification[];
  refresh: () => Promise<void>;
  ack: (id: string) => Promise<void>;
  bookingsView: "book" | "mine";
  setBookingsView: (v: "book" | "mine") => void;
};

const LiveContext = createContext<LiveValue | undefined>(undefined);
const POLL_MS = 2000;

export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bookingsView, setBookingsView] = useState<"book" | "mine">("book");
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const [o, r, n] = await Promise.all([
        api<{ orders: Order[] }>("GET", "/orders"),
        api<{ reservations: Reservation[] }>("GET", "/reservations"),
        api<{ notifications: AppNotification[] }>("GET", "/notifications"),
      ]);
      setOrders(o.orders);
      setReservations(r.reservations);
      setNotifications(n.notifications);
    } catch {
      /* offline or logged out: try again on the next tick */
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setOrders([]);
      setReservations([]);
      setNotifications([]);
      return;
    }
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [isLoggedIn, refresh]);

  const ack = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await api("POST", `/notifications/${id}/ack`).catch(() => {});
    },
    []
  );

  return (
    <LiveContext.Provider value={{ orders, reservations, notifications, refresh, ack, bookingsView, setBookingsView }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within LiveDataProvider");
  return ctx;
}
