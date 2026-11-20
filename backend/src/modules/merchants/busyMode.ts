// Sprint 3 "busy mode / auto-pause". The stall picks a wait limit. When its live wait (waitTime.ts) goes past it:
//   "warn":  customers see "Very busy, about 32 min" and must tick "I'm OK waiting" before they can order;
//   "pause": new orders stop until the queue is back under the limit, then they start again by themselves.
// No database here, so it is easy to test (tests/busyMode.test.ts).

export type BusyMode = { on: boolean; limitMinutes: number; action: "warn" | "pause" };

export const LIMIT_CHOICES = [15, 20, 30, 45] as const;
export const DEFAULT_BUSY_MODE: BusyMode = { on: false, limitMinutes: 30, action: "warn" };

export type BusyState = {
  waitLimit: number | null; // null when busy mode is off
  overLimit: boolean;
  ordersPaused: boolean; // "pause" and over the limit: new orders are refused
  longWaitWarning: boolean; // "warn" and over the limit: customers must accept the wait
};

export function busyState(mode: BusyMode | undefined, waitMinutes: number, open: boolean): BusyState {
  if (!mode?.on || !open) return { waitLimit: mode?.on ? mode.limitMinutes : null, overLimit: false, ordersPaused: false, longWaitWarning: false };
  const overLimit = waitMinutes > mode.limitMinutes;
  return { waitLimit: mode.limitMinutes, overLimit, ordersPaused: overLimit && mode.action === "pause", longWaitWarning: overLimit && mode.action === "warn" };
}

/** The reason a new order is refused right now, or null when it can go ahead. */
export function busyRefusal(shopName: string, mode: BusyMode | undefined, waitMinutes: number, acceptLongWait: boolean): string | null {
  const s = busyState(mode, waitMinutes, true);
  if (s.ordersPaused) return `${shopName} has paused new orders while the kitchen catches up (about ${waitMinutes} min wait). Orders open again by themselves soon.`;
  if (s.longWaitWarning && !acceptLongWait) return `${shopName} is very busy right now: about ${waitMinutes} min wait. Tick "I'm OK waiting" to order anyway.`;
  return null;
}

/** Checks a busy-mode update from the merchant app. Returns an error message, or null when it is fine. */
export function badBusyMode(b: any): string | null {
  if (typeof b?.on !== "boolean") return "on must be true or false";
  if (!Number.isInteger(b.limitMinutes) || b.limitMinutes < 5 || b.limitMinutes > 120) return "Wait limit must be 5 to 120 minutes";
  if (b.action !== "warn" && b.action !== "pause") return "action must be warn or pause";
  return null;
}
