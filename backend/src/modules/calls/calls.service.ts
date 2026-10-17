// In-app voice calls between customer and restaurant. The server only relays the WebRTC
// handshake (offer, answer, ICE candidates). The audio itself flows device to device.
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { db } from "../../store/db.js";
import type { Call, ChatRole, User } from "../../store/types.js";
import { addMessage, findThread, roleIn } from "../chat/chat.service.js";

let signalSeq = 0;

function mmss(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function note(c: Call, text: string) {
  try { addMessage(findThread(c.kind, c.threadId), "system", text); } catch { /* thread gone */ }
}

/** Calls still ringing or connected. */
const live = (c: Call) => c.status === "ringing" || c.status === "active";

export function startCall(u: User, kind: string, threadId: string): Call {
  const t = findThread(kind, threadId);
  const role = roleIn(t, u);
  if (!t.canCall) throw new HttpError(409, "Calls are only available while an order or booking is in progress");
  if (!t.merchantUserId) throw new HttpError(409, "The restaurant cannot take calls right now");
  const callee = role === "customer" ? t.merchantUserId : t.customerUserId;
  for (const c of db.calls.values()) {
    if (live(c) && (c.callerUserId === u.id || c.calleeUserId === u.id)) throw new HttpError(409, "You are already in a call");
    if (live(c) && (c.callerUserId === callee || c.calleeUserId === callee)) throw new HttpError(409, "They are on another call. Try again in a moment or send a message.");
  }
  const call: Call = {
    id: uid("call"), kind: t.kind, threadId: t.id, callerRole: role, callerUserId: u.id, calleeUserId: callee,
    callerName: role === "customer" ? t.customerName : t.merchantName, calleeName: role === "customer" ? t.merchantName : t.customerName,
    status: "ringing", createdAt: Date.now(), signals: [],
  };
  db.calls.set(call.id, call);
  return call;
}

export function getCall(u: User, id: string): Call {
  const c = db.calls.get(id);
  if (!c || (c.callerUserId !== u.id && c.calleeUserId !== u.id)) throw new HttpError(404, "Call not found");
  return c;
}

export function roleOf(c: Call, u: User): ChatRole {
  return c.callerUserId === u.id ? c.callerRole : c.callerRole === "customer" ? "merchant" : "customer";
}

/** The call (ringing or connected) this user is part of, if any. Also finishes calls that rang too long. */
export function currentCall(u: User): Call | undefined {
  expireCalls();
  for (const c of db.calls.values()) if (live(c) && (c.callerUserId === u.id || c.calleeUserId === u.id)) return c;
  return undefined;
}

export function expireCalls(now = Date.now()) {
  for (const c of db.calls.values()) {
    if (c.status === "ringing" && now - c.createdAt > env.callRingMs) {
      c.status = "missed"; c.endedAt = now;
      note(c, `Missed call from ${c.callerName}`);
    }
    if (c.status === "active" && c.answeredAt && now - c.answeredAt > 2 * 3600000) { c.status = "ended"; c.endedAt = now; }
  }
}

export function acceptCall(u: User, id: string): Call {
  const c = getCall(u, id);
  if (c.calleeUserId !== u.id) throw new HttpError(403, "Only the person being called can answer");
  if (c.status !== "ringing") throw new HttpError(409, "This call is no longer ringing");
  c.status = "active"; c.answeredAt = Date.now();
  return c;
}

export function declineCall(u: User, id: string): Call {
  const c = getCall(u, id);
  if (c.calleeUserId !== u.id) throw new HttpError(403, "Only the person being called can decline");
  if (c.status !== "ringing") throw new HttpError(409, "This call is no longer ringing");
  c.status = "declined"; c.endedAt = Date.now();
  note(c, `${c.calleeName} declined the call`);
  return c;
}

/** Either side hangs up. A caller cancelling while it rings counts as missed. */
export function endCall(u: User, id: string): Call {
  const c = getCall(u, id);
  if (c.status === "ringing") {
    c.status = "missed"; c.endedAt = Date.now();
    note(c, `Missed call from ${c.callerName}`);
  } else if (c.status === "active") {
    c.status = "ended"; c.endedAt = Date.now();
    note(c, `Call ended · ${mmss(c.endedAt - (c.answeredAt ?? c.createdAt))}`);
  }
  return c;
}

export function addSignal(u: User, id: string, type: unknown, data: unknown) {
  const c = getCall(u, id);
  if (!live(c)) throw new HttpError(409, "This call has ended");
  if (type !== "offer" && type !== "answer" && type !== "candidate") throw new HttpError(400, "Unknown signal type");
  if (JSON.stringify(data ?? null).length > 20000) throw new HttpError(400, "Signal too large");
  c.signals.push({ seq: ++signalSeq, from: roleOf(c, u), type, data });
}

export function callView(c: Call, u: User, after = 0) {
  const me = roleOf(c, u);
  return {
    id: c.id, kind: c.kind, threadId: c.threadId, status: c.status,
    direction: c.callerUserId === u.id ? "outgoing" : "incoming",
    peerName: c.callerUserId === u.id ? c.calleeName : c.callerName,
    createdAt: c.createdAt, answeredAt: c.answeredAt, endedAt: c.endedAt, ringMs: env.callRingMs,
    signals: c.signals.filter((s) => s.from !== me && s.seq > after),
    serverNow: Date.now(),
  };
}
