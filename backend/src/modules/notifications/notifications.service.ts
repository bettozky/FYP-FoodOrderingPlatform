import { uid } from "../../lib/ids.js";
import { db } from "../../store/db.js";

export function notify(userId: string, type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  const n = { id: uid("n"), userId, type, title, body, data, createdAt: Date.now() };
  db.notifications.set(n.id, n);
  return n;
}

export function notifyMerchant(merchantId: string, type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  const m = db.merchants.get(merchantId);
  if (m?.ownerUserId) notify(m.ownerUserId, type, title, body, data);
}
