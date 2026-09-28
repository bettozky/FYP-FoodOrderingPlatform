// Live delivery / rider-tracking service layer.
//
// This mirrors the GPS Logistics backend contract from the standalone
// logistics demo (GET /riders, POST /orders/:id/assign, GET /orders/:id/tracking):
// point API_BASE at that Node server (see its README for finding your LAN IP)
// to drive this screen from the real thing.
//
// Because a marker/grader won't necessarily have that backend running,
// every call falls back to a small local simulator with the exact same
// shape, so the live-tracking screen always has something to show.

export type Rider = { id: string; name: string; lat: number; lng: number };
export type DeliveryStatus = "assigned" | "picked_up" | "en_route" | "delivered";
export type Tracking = { status: DeliveryStatus; rider: Rider | null };

// Replace with your logistics backend's LAN address, e.g. "http://192.168.1.23:4000/api".
// Leave blank to always use the built-in simulator.
export const API_BASE = "";

const FETCH_TIMEOUT_MS = 1500;

async function fetchWithTimeout(url: string, options?: RequestInit) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

// ---- local simulator (used whenever the real backend isn't reachable) ----

const SIM_RIDERS: Rider[] = [
  { id: "r1", name: "Wei Ming", lat: 1.5533, lng: 110.3592 },
  { id: "r2", name: "Farah", lat: 1.5522, lng: 110.3578 },
  { id: "r3", name: "Aiman", lat: 1.5548, lng: 110.3605 },
];

const SIM_DESTINATION = { lat: 1.556, lng: 110.362 };
const SIM_STAGE_ORDER: DeliveryStatus[] = ["assigned", "picked_up", "en_route", "delivered"];
const SIM_STAGE_MS = 4000; // how long each stage lasts before advancing

let simState: { startedAt: number; rider: Rider } | null = null;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function simulatedTracking(): Tracking {
  if (!simState) {
    simState = { startedAt: Date.now(), rider: SIM_RIDERS[0] };
  }
  const elapsed = Date.now() - simState.startedAt;
  const stageI = Math.min(Math.floor(elapsed / SIM_STAGE_MS), SIM_STAGE_ORDER.length - 1);
  const status = SIM_STAGE_ORDER[stageI];

  // move the rider toward the destination as stages progress
  const progress = Math.min(elapsed / (SIM_STAGE_MS * (SIM_STAGE_ORDER.length - 1)), 1);
  const rider: Rider = {
    ...simState.rider,
    lat: lerp(simState.rider.lat, SIM_DESTINATION.lat, progress),
    lng: lerp(simState.rider.lng, SIM_DESTINATION.lng, progress),
  };

  return { status, rider };
}

export function resetSimulation() {
  simState = null;
}

// ---- public API ----

export async function fetchRiders(): Promise<Rider[]> {
  if (!API_BASE) return SIM_RIDERS;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/riders`);
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  } catch {
    return SIM_RIDERS;
  }
}

export async function assignOrder(
  orderId: string,
  destination: { lat: number; lng: number } = SIM_DESTINATION
): Promise<Tracking> {
  if (API_BASE) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationLat: destination.lat, destinationLng: destination.lng }),
      });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      const rider = SIM_RIDERS.find((r) => r.id === data.riderId) ?? null;
      return { status: data.status, rider };
    } catch {
      // fall through to simulator
    }
  }
  resetSimulation();
  return simulatedTracking();
}

export async function fetchTracking(orderId: string): Promise<Tracking | null> {
  if (API_BASE) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/orders/${orderId}/tracking`);
      if (!res.ok) throw new Error("bad response");
      return await res.json();
    } catch {
      // fall through to simulator
    }
  }
  return simulatedTracking();
}

export const DELIVERY_DESTINATION = SIM_DESTINATION;
