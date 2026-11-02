// Which parts of `db` are saved, and into which table. To save a new kind of data: add a line here and a table in
// database/migrations (id + data JSONB + any columns you want to filter on).
import { db } from "../db.js";

export interface Column {
  name: string;
  type: "text" | "bigint";
  get: (item: any) => unknown;
}

export interface Collection {
  /** table name */
  table: string;
  items: () => Iterable<any>;
  idOf: (item: any) => string;
  /** extra indexed columns (the full record is always stored in `data`) */
  columns: Column[];
  /** put a loaded record back into `db` */
  add: (item: any) => void;
  /** after loading: put arrays into the order they are used in */
  afterLoad?: () => void;
}

const text = (name: string, get: (i: any) => unknown): Column => ({ name, type: "text", get });
const big = (name: string, get: (i: any) => unknown): Column => ({ name, type: "bigint", get });

export const COLLECTIONS: Collection[] = [
  { table: "users", items: () => db.users.values(), idOf: (u) => u.id, columns: [text("email", (u) => u.email), text("role", (u) => u.role)], add: (u) => db.users.set(u.id, u) },
  {
    table: "sessions",
    items: () => [...db.tokens].map(([token, userId]) => ({ token, userId, expiresAt: db.tokenExpiry.get(token) ?? 0 })),
    idOf: (s) => s.token,
    columns: [text("user_id", (s) => s.userId), big("expires_at", (s) => s.expiresAt)],
    add: (s) => { if (s.expiresAt > Date.now()) { db.tokens.set(s.token, s.userId); db.tokenExpiry.set(s.token, s.expiresAt); } },
  },
  { table: "merchants", items: () => db.merchants.values(), idOf: (m) => m.id, columns: [text("owner_user_id", (m) => m.ownerUserId ?? null), text("approval", (m) => m.approval)], add: (m) => db.merchants.set(m.id, m) },
  { table: "dishes", items: () => db.dishes.values(), idOf: (d) => d.id, columns: [text("merchant_id", (d) => d.merchantId)], add: (d) => db.dishes.set(d.id, d) },
  {
    table: "orders", items: () => db.orders.values(), idOf: (o) => o.id,
    columns: [text("customer_id", (o) => o.customerId), text("merchant_id", (o) => o.merchantId), text("status", (o) => o.status), big("created_at", (o) => o.createdAt)],
    add: (o) => db.orders.set(o.id, o),
  },
  { table: "payments", items: () => db.payments.values(), idOf: (p) => p.id, columns: [text("order_id", (p) => p.for)], add: (p) => db.payments.set(p.id, p) },
  {
    table: "reservations", items: () => db.reservations.values(), idOf: (r) => r.id,
    columns: [text("customer_id", (r) => r.customerId), text("merchant_id", (r) => r.merchantId), text("status", (r) => r.status), big("created_at", (r) => r.createdAt)],
    add: (r) => db.reservations.set(r.id, r),
  },
  { table: "vouchers", items: () => db.vouchers, idOf: (v) => v.id, columns: [text("merchant_id", (v) => v.merchantId ?? null)], add: (v) => db.vouchers.push(v) },
  { table: "notifications", items: () => db.notifications.values(), idOf: (n) => n.id, columns: [text("user_id", (n) => n.userId), big("created_at", (n) => n.createdAt)], add: (n) => db.notifications.set(n.id, n) },
  { table: "deliveries", items: () => db.deliveries.values(), idOf: (d) => d.orderId, columns: [], add: (d) => db.deliveries.set(d.orderId, d) },
  { table: "jobs", items: () => db.jobs.values(), idOf: (j) => j.id, columns: [text("merchant_id", (j) => j.merchantId)], add: (j) => db.jobs.set(j.id, j) },
  { table: "reviews", items: () => db.reviews, idOf: (r) => r.id, columns: [text("dish_id", (r) => r.dishId), text("user_id", (r) => r.userId)], add: (r) => db.reviews.push(r) },
  {
    table: "messages", items: () => db.messages, idOf: (m) => m.id, columns: [text("thread_id", (m) => m.threadId)], add: (m) => db.messages.push(m),
    afterLoad: () => db.messages.sort((a, b) => a.seq - b.seq),
  },
  { table: "calls", items: () => db.calls.values(), idOf: (c) => c.id, columns: [], add: (c) => db.calls.set(c.id, c) },
  { table: "audit_log", items: () => db.audit, idOf: (a) => a.id, columns: [], add: (a) => db.audit.push(a), afterLoad: () => db.audit.sort((a, b) => b.at - a.at) }, // newest first
  { table: "addresses", items: () => db.addresses.values(), idOf: (a) => a.id, columns: [text("user_id", (a) => a.userId)], add: (a) => db.addresses.set(a.id, a) },
  { table: "favourites", items: () => db.favourites.values(), idOf: (f) => f.userId, columns: [], add: (f) => db.favourites.set(f.userId, f) },
  {
    table: "job_applications", items: () => db.applications.values(), idOf: (a) => a.id,
    columns: [text("job_id", (a) => a.jobId), text("merchant_id", (a) => a.merchantId), text("user_id", (a) => a.userId), text("status", (a) => a.status), big("created_at", (a) => a.createdAt)],
    add: (a) => db.applications.set(a.id, a),
  },
  { table: "announcements", items: () => db.announcements.values(), idOf: (a) => a.id, columns: [text("merchant_id", (a) => a.merchantId ?? null), big("created_at", (a) => a.createdAt)], add: (a) => db.announcements.set(a.id, a) },
];
