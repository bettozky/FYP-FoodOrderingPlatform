// End-to-end API smoke test. Start the backend first with short timers:
//   ORDER_RESPONSE_MS=3000 PAYMENT_WINDOW_MS=3000 CALL_RING_MS=2000 RESERVATION_RESPONSE_MS=3000 DELIVERY_STAGE_MS=500 npm run dev
// then run:  node tests/smoke.mjs
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;

await call("POST", "/api/dev/reset");
const cust = await login("demo@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");
const admin = await login("admin@scootmeal.test", "admin123");

// age block
let r = await call("POST", "/api/auth/register", null, { name: "Kid", email: "kid@x.com", password: "secret1", dob: new Date(Date.now() - 10 * 365 * 864e5).toISOString().slice(0, 10) });
ok(r.status === 403, "under-age sign up blocked");
r = await call("POST", "/api/orders", null, {});
ok(r.status === 401, "no guest ordering");

const addr = { label: "Hostel", line: "Hostel A", lat: 1.556, lng: 110.362 };
const cart = [
  { dishId: "d1", mode: "delivery", qty: 1 },
  { dishId: "d2", mode: "dine_in", qty: 1 },
  { dishId: "d11", mode: "takeaway", qty: 1 },
];
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: cart, address: addr, voucherId: "v1" });
ok(r.status === 201 && r.body.order.status === "awaiting_merchant", "order request sent, awaiting merchant");
const o1 = r.body.order;
ok(!o1.paymentId && o1.refunded === 0, "nothing is charged when the request is sent");
ok(Math.abs(o1.total - (8.5 + 7 + 6.5 + 3.5 - 3)) < 0.01, "voucher RM3 + one delivery fee applied: " + o1.total);
r = await call("POST", `/api/orders/${o1.id}/pay`, cust, { card: { number: "4242 4242 4242 4242" } });
ok(r.status === 409, "cannot pay before the restaurant confirms");
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d1", mode: "delivery", qty: 1 }] });
ok(r.status === 400, "delivery needs address");
r = await call("POST", "/api/orders", cust, { merchantId: "m3", items: [{ dishId: "d6", mode: "dine_in", qty: 1 }] });
ok(r.status === 409, "sold-out/closed blocked");

r = await call("POST", `/api/merchant/orders/${o1.id}/respond`, merch, { accept: true });
ok(r.body.order?.status === "awaiting_payment" && r.body.order.payBy > Date.now(), "merchant confirms -> awaiting payment");
r = await call("GET", "/api/notifications", cust);
ok(r.body.notifications.some((n) => n.type === "order_accepted"), "customer told to pay");
r = await call("POST", `/api/orders/${o1.id}/pay`, cust, { card: { number: "4000 0000 0000 0002" } });
ok(r.status === 402, "declined card rejected, order still awaiting payment");
r = await call("POST", `/api/orders/${o1.id}/pay`, cust, { card: { number: "4242 4242 4242 4242" } });
ok(r.status === 200 && r.body.order.status === "preparing" && !!r.body.order.paymentId, "customer pays after confirmation -> preparing");
r = await call("POST", `/api/orders/${o1.id}/pay`, cust, { card: { number: "4242 4242 4242 4242" } });
ok(r.status === 409, "cannot pay twice");
r = await call("GET", "/api/notifications", merch);
ok(r.body.notifications.some((n) => n.type === "order_paid"), "merchant told the order is paid");
r = await call("POST", `/api/merchant/orders/${o1.id}/items/${o1.items[2].id}/out-of-stock`, merch);
ok(r.status === 200 && r.body.order.decision === "pending", "out-of-stock sets decision pending");
r = await call("POST", `/api/merchant/orders/${o1.id}/ready`, merch, { mode: "dine_in" });
ok(r.status === 409, "cannot mark ready while customer decision pending");
r = await call("GET", "/api/notifications", cust);
ok(r.body.notifications.some((n) => n.type === "out_of_stock"), "customer notified of out-of-stock");
r = await call("POST", `/api/orders/${o1.id}/decision`, cust, { choice: "continue" });
ok(r.body.order.refunded === 6.5, "partial order refund of the missing item: " + r.body.order.refunded);
r = await call("POST", `/api/merchant/orders/${o1.id}/ready`, merch, { mode: "dine_in" });
ok(r.status === 200, "dine-in ready");
r = await call("GET", "/api/notifications", cust);
const fr = r.body.notifications.find((n) => n.type === "food_ready");
ok(!!fr, "food-ready notification (persistent)");
r = await call("POST", `/api/orders/${o1.id}/collected`, cust, { mode: "dine_in" });
ok(r.status === 200, "customer confirms collection");
r = await call("GET", "/api/notifications", cust);
ok(!r.body.notifications.some((n) => n.type === "food_ready"), "food-ready popup cleared after confirm");
r = await call("POST", `/api/merchant/orders/${o1.id}/handover`, merch);
ok(r.status === 200, "delivery handed over");
r = await call("GET", `/api/delivery/orders/${o1.id}/tracking`, cust);
ok(["assigned", "picked_up"].includes(r.body.status), "tracking " + r.body.status);
await sleep(4500);
r = await call("GET", `/api/orders/${o1.id}`, cust);
ok(r.body.order.status === "completed", "order completed after delivery: " + r.body.order.status);
r = await call("POST", `/api/orders/${o1.id}/reviews`, cust, { dishId: "d1", rating: 5, comment: "Great" });
ok(r.status === 201, "item review");
r = await call("POST", `/api/orders/${o1.id}/reviews`, cust, { dishId: "d1", rating: 4 });
ok(r.status === 409, "no double review");

// merchant never answers -> cancelled, nothing to refund
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d1", mode: "takeaway", qty: 1 }] });
const o2 = r.body.order;
await sleep(4500);
r = await call("GET", `/api/orders/${o2.id}`, cust);
ok(r.body.order.status === "expired" && r.body.order.cancelReason === "no_reply" && r.body.order.refunded === 0, "no reply in time auto-cancels (nothing was charged)");
r = await call("POST", `/api/merchant/orders/${o2.id}/respond`, merch, { accept: true });
ok(r.status === 409, "cannot accept after expiry");

// merchant declines
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d2", mode: "takeaway", qty: 1 }] });
const o3 = r.body.order;
r = await call("POST", `/api/merchant/orders/${o3.id}/respond`, merch, { accept: false });
ok(r.body.order.status === "rejected", "merchant declines, no charge");

// confirmed but customer never pays
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d2", mode: "takeaway", qty: 1 }] });
const o4 = r.body.order;
await call("POST", `/api/merchant/orders/${o4.id}/respond`, merch, { accept: true });
await sleep(4500);
r = await call("GET", `/api/orders/${o4.id}`, cust);
ok(r.body.order.status === "expired" && r.body.order.cancelReason === "not_paid", "unpaid order released after the payment window");
r = await call("POST", `/api/orders/${o4.id}/pay`, cust, { card: { number: "4242424242424242" } });
ok(r.status === 409, "cannot pay an expired order");

// customer withdraws a request
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d2", mode: "takeaway", qty: 1 }] });
const o5 = r.body.order;
r = await call("POST", `/api/orders/${o5.id}/cancel`, cust);
ok(r.body.order.status === "cancelled", "customer can cancel before paying");

// ---- live chat ----
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d2", mode: "dine_in", qty: 1 }] });
const o6 = r.body.order;
r = await call("POST", `/api/chat/order/${o6.id}`, cust, { text: "Can I get less chilli?" });
ok(r.status === 201, "customer sends a chat message before payment");
r = await call("GET", "/api/chat/unread", merch);
ok(r.body.unread[`order:${o6.id}`] === 1, "merchant sees 1 unread");
r = await call("GET", `/api/chat/order/${o6.id}`, merch);
ok(r.body.messages.length === 1 && r.body.you === "merchant" && r.body.peerName === "Demo Student", "merchant reads the thread");
r = await call("GET", "/api/chat/unread", merch);
ok(!r.body.unread[`order:${o6.id}`], "reading clears unread");
r = await call("POST", `/api/chat/order/${o6.id}`, merch, { text: "Sure, noted." });
r = await call("GET", `/api/chat/order/${o6.id}?after=1`, cust);
ok(r.body.messages.length === 1 && r.body.messages[0].from === "merchant", "customer receives the reply (incremental fetch)");
const outsider = (await call("POST", "/api/auth/register", null, { name: "Eve", email: "eve@x.com", password: "secret1", dob: "1999-01-01" })).body.token;
r = await call("GET", `/api/chat/order/${o6.id}`, outsider);
ok(r.status === 404, "other customers cannot read the chat");
r = await call("POST", `/api/chat/order/${o6.id}`, cust, { text: "" });
ok(r.status === 400, "empty message rejected");

// ---- in-app call ----
r = await call("POST", "/api/calls", merch, { kind: "order", id: o6.id });
ok(r.status === 201 && r.body.call.status === "ringing" && r.body.call.direction === "outgoing", "merchant starts an in-app call");
const callId = r.body.call.id;
r = await call("GET", "/api/calls/current", cust);
ok(r.body.call?.id === callId && r.body.call.direction === "incoming" && r.body.call.peerName === "Ah Seng Noodle House", "customer sees the incoming call");
r = await call("POST", `/api/calls/${callId}/signal`, merch, { type: "offer", data: { sdp: "x" } });
r = await call("GET", "/api/calls/current", cust);
ok(r.body.call.signals.length === 1 && r.body.call.signals[0].type === "offer", "offer is relayed to the callee only");
r = await call("POST", `/api/calls/${callId}/accept`, merch);
ok(r.status === 403, "caller cannot answer their own call");
r = await call("POST", `/api/calls/${callId}/accept`, cust);
ok(r.body.call.status === "active", "customer answers");
r = await call("POST", `/api/calls/${callId}/signal`, cust, { type: "answer", data: { sdp: "y" } });
r = await call("GET", "/api/calls/current?after=0", merch);
ok(r.body.call.signals.length === 1 && r.body.call.signals[0].type === "answer", "answer relayed back to the caller");
r = await call("POST", "/api/calls", cust, { kind: "order", id: o6.id });
ok(r.status === 409, "cannot start a second call while busy");
r = await call("POST", `/api/calls/${callId}/end`, cust);
ok(r.body.call.status === "ended", "either side can hang up");
r = await call("GET", `/api/chat/order/${o6.id}`, cust);
ok(r.body.messages.some((m) => m.from === "system" && m.text.startsWith("Call ended")), "call log appears in the chat");
r = await call("POST", "/api/calls", cust, { kind: "order", id: o6.id });
const c2 = r.body.call.id;
await sleep(2600);
r = await call("GET", `/api/calls/${c2}`, cust);
ok(r.body.call.status === "missed", "unanswered call becomes missed");
r = await call("POST", "/api/calls", outsider, { kind: "order", id: o6.id });
ok(r.status === 404, "outsiders cannot call into a conversation");
r = await call("POST", "/api/calls", cust, { kind: "order", id: o5.id });
ok(r.status === 409, "no calls on a cancelled order");
r = await call("POST", `/api/calls/${c2}/decline`, merch);
ok(r.status === 409, "cannot decline a call that is no longer ringing");
r = await call("POST", "/api/calls", merch, { kind: "order", id: o6.id });
const c3 = r.body.call.id;
r = await call("POST", `/api/calls/${c3}/decline`, cust);
ok(r.body.call.status === "declined", "callee can decline");

// reservations
const tomorrow = new Date(Date.now() + 864e5 + 8 * 36e5).toISOString().slice(0, 10);
r = await call("POST", "/api/reservations", cust, { merchantId: "m2", date: tomorrow, time: "12:00", partySize: 4, payNow: true, preorder: [{ dishId: "d3", qty: 2 }, { dishId: "d4", qty: 1 }] });
ok(r.status === 201 && r.body.reservation.status === "awaiting_restaurant", "reservation awaiting restaurant");
const rs = r.body.reservation;
ok(rs.paid === 0 && rs.amountDue === 5 + 7.5 * 2 + 9, "Pay Now booking is not charged at booking; amount due = deposit + preorder: " + rs.amountDue);
r = await call("POST", `/api/merchant/reservations/${rs.id}/respond`, null, { accept: true });
ok(r.status === 401, "merchant endpoint needs login");
const m2 = await call("POST", "/api/auth/login", null, { email: "ahseng@scootmeal.test", password: "merchant123" });
r = await call("POST", `/api/merchant/reservations/${rs.id}/respond`, merch, { accept: true, table: "T1" });
ok(r.status === 404, "other merchant's reservation hidden");
// register a second merchant, approve through admin
r = await call("POST", "/api/auth/register-merchant", null, { email: "kak@x.com", password: "secret1", ownerName: "Kak Yah", phone: "+6012", businessName: "Test Stall" });
const pm = r.body.token;
r = await call("GET", "/api/merchant/dishes", pm);
ok(r.status === 403, "pending merchant is blocked");
r = await call("PATCH", `/api/admin/merchants/${r.body.merchant?.id ?? "x"}`, admin, { approval: "approved" });
r = await call("GET", "/api/admin/merchants?status=pending", admin);
ok(r.body.merchants.length >= 3, "admin sees pending merchants");
r = await call("GET", "/api/admin/merchants", merch);
ok(r.status === 403, "merchant cannot use admin API");
const kak = r.body;
// m2 owner doesn't exist as login in seed; approve flow tested via kak
const pend = (await call("GET", "/api/admin/merchants?status=pending", admin)).body.merchants.find((x) => x.name === "Test Stall");
await call("PATCH", `/api/admin/merchants/${pend.id}`, admin, { approval: "approved" });
r = await call("GET", "/api/merchant/dishes", pm);
ok(r.status === 200, "approved merchant gets access");
void kak; void m2;

// reservation lifecycle using seeded m2 ownership: m2 has no owner login, so reassign via dev path not available; test expiry
await sleep(6000);
r = await call("GET", "/api/reservations", cust);
const exp = r.body.reservations.find((x) => x.id === rs.id);
ok(exp.status === "expired" && exp.paid === 0, "reservation expiry (shortened): nothing was charged");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
