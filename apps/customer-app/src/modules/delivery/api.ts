// Live delivery tracking. Talks to the backend's delivery module (simulated rider for now; the same
// endpoints will be fed by Lalamove later - NFR-3, NFR-8). Requires the user to be logged in.
import { api } from "../../shared/api/client";

export type Rider = { id: string; name: string; lat: number; lng: number };
export type DeliveryStatus = "waiting" | "assigned" | "picked_up" | "en_route" | "delivered";
export type Tracking = {
  status: DeliveryStatus;
  rider: Rider | null;
  destination?: { lat: number; lng: number };
  restaurant?: { lat: number; lng: number };
};

// Fallback map centre/destination if an order has no coordinates (Swinburne Sarawak campus).
export const DELIVERY_DESTINATION = { lat: 1.556, lng: 110.362 };

export async function fetchRiders(): Promise<Rider[]> {
  return api<Rider[]>("GET", "/delivery/riders");
}

export async function fetchTracking(orderId: string): Promise<Tracking | null> {
  try {
    return await api<Tracking>("GET", `/delivery/orders/${orderId}/tracking`);
  } catch {
    return null;
  }
}

/** Kept for the screens' start-up call: the backend assigns the rider when the restaurant hands the food over. */
export async function assignOrder(orderId: string, _destination?: { lat: number; lng: number }): Promise<Tracking> {
  return (await fetchTracking(orderId)) ?? { status: "waiting", rider: null };
}
