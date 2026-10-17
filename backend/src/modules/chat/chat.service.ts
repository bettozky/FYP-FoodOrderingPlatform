// Live chat between a customer and a restaurant, attached to an order or a table reservation.
import { HttpError } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { db } from "../../store/db.js";
import type { ChatMessage, ChatRole, ThreadKind, User } from "../../store/types.js";

export interface Thread {
  kind: ThreadKind;
  id: string;
  customerUserId: string;
  merchantUserId?: string;
  customerName: string;
  merchantName: string;
  open: boolean; // chat is closed once a request was declined, expired or cancelled
  canCall: boolean;
}

const ORDER_CLOSED = ["rejected", "expired", "cancelled"];
const RES_CLOSED = ["declined", "expired", "cancelled"];

export function findThread(kind: string, id: string): Thread {
  if (kind === "order") {
    const o = db.orders.get(id);
    if (!o) throw new HttpError(404, "Order not found");
    const m = db.merchants.get(o.merchantId);
    return {
      kind, id, customerUserId: o.customerId, merchantUserId: m?.ownerUserId, customerName: o.customerName, merchantName: o.merchantName,
      open: !ORDER_CLOSED.includes(o.status), canCall: ["awaiting_merchant", "awaiting_payment", "preparing"].includes(o.status),
    };
  }
  if (kind === "reservation") {
    const r = db.reservations.get(id);
    if (!r) throw new HttpError(404, "Reservation not found");
    const m = db.merchants.get(r.merchantId);
    return {
      kind, id, customerUserId: r.customerId, merchantUserId: m?.ownerUserId, customerName: r.customerName, merchantName: r.merchantName,
      open: !RES_CLOSED.includes(r.status), canCall: ["awaiting_restaurant", "confirmed"].includes(r.status),
    };
  }
  throw new HttpError(400, "kind must be order or reservation");
}

/** Which side of the thread the signed-in user is. Throws if they are neither. */
export function roleIn(t: Thread, u: User): ChatRole {
  if (u.role === "customer" && u.id === t.customerUserId) return "customer";
  if (u.role === "merchant" && t.merchantUserId && u.id === t.merchantUserId) return "merchant";
  throw new HttpError(404, "Conversation not found");
}

let seq = 0;

export function addMessage(t: Thread, from: ChatRole | "system", text: string): ChatMessage {
  const m: ChatMessage = { seq: ++seq, id: uid("msg"), kind: t.kind, threadId: t.id, from, text, at: Date.now(), readBy: from === "system" ? [] : [from] };
  db.messages.push(m);
  return m;
}

export function postMessage(t: Thread, role: ChatRole, raw: unknown): ChatMessage {
  const text = String(raw ?? "").trim();
  if (!text) throw new HttpError(400, "Type a message first");
  if (text.length > 500) throw new HttpError(400, "Messages are limited to 500 characters");
  if (!t.open) throw new HttpError(409, "This conversation is closed");
  return addMessage(t, role, text);
}

/** Messages after `after`. Reading marks the other side's messages as read by me. */
export function readMessages(t: Thread, role: ChatRole, after: number): ChatMessage[] {
  const all = db.messages.filter((m) => m.kind === t.kind && m.threadId === t.id);
  for (const m of all) if (m.from !== role && m.from !== "system" && !m.readBy.includes(role)) m.readBy.push(role);
  for (const m of all) if (m.from === "system" && !m.readBy.includes(role)) m.readBy.push(role);
  return all.filter((m) => m.seq > after);
}

/** Unread counts per thread key ("order:SM-10251") for the signed-in user. */
export function unreadFor(u: User): Record<string, number> {
  const out: Record<string, number> = {};
  const cache = new Map<string, ChatRole | null>();
  for (const m of db.messages) {
    if (m.from === "system") continue;
    const key = `${m.kind}:${m.threadId}`;
    if (!cache.has(key)) {
      try { cache.set(key, roleIn(findThread(m.kind, m.threadId), u)); } catch { cache.set(key, null); }
    }
    const role = cache.get(key);
    if (role && m.from !== role && !m.readBy.includes(role)) out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
