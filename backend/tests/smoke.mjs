// End-to-end API smoke test. Start the backend first with short timers:
//   ORDER_RESPONSE_MS=4000 RESERVATION_RESPONSE_MS=4000 DELIVERY_STAGE_MS=1000 npm run dev
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
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: cart, address: addr, card: { number: "4000 0000 0000 0002" } });
ok(r.status === 402, "declined card rejected");
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: cart, address: addr, voucherId: "v1", card: { number: "4242 4242 4242 4242" } });
ok(r.status === 201 && r.body.order.status === "awaiting_merchant", "mixed order paid once, awaiting merchant");
const o1 = r.body.order;
ok(Math.abs(o1.total - (8.5 + 7 + 6.5 + 3.5 - 3)) < 0.01, "voucher RM3 + one delivery fee applied: " + o1.total);
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d1", mode: "delivery", qty: 1 }], card: { number: "4242424242424242" } });
ok(r.status === 400, "delivery needs address");
r = await call("POST", "/api/orders", cust, { merchantId: "m3", items: [{ dishId: "d6", mode: "dine_in", qty: 1 }], card: { number: "4242424242424242" } });
ok(r.status === 409, "sold-out/closed blocked");

r = await call("POST", `/api/merchant/orders/${o1.id}/respond`, merch, { accept: true });
ok(r.body.order?.status === "preparing", "merchant accepts");
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

// timeout -> refund
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d1", mode: "takeaway", qty: 1 }], card: { number: "4242424242424242" } });
const o2 = r.body.order;
await sleep(5500);
r = await call("GET", `/api/orders/${o2.id}`, cust);
ok(r.body.order.status === "expired" && r.body.order.refunded === o2.total, "10-min timeout (shortened) auto-cancels + refunds");
r = await call("POST", `/api/merchant/orders/${o2.id}/respond`, merch, { accept: true });
ok(r.status === 409, "cannot accept after expiry");

// reservations
const tomorrow = new Date(Date.now() + 864e5 + 8 * 36e5).toISOString().slice(0, 10);
r = await call("POST", "/api/reservations", cust, { merchantId: "m2", date: tomorrow, time: "12:00", partySize: 4, payNow: true, preorder: [{ dishId: "d3", qty: 2 }, { dishId: "d4", qty: 1 }], card: { number: "4242424242424242" } });
ok(r.status === 201 && r.body.reservation.status === "awaiting_restaurant", "reservation awaiting restaurant");
const rs = r.body.reservation;
ok(rs.paid === 5 + 7.5 * 2 + 9, "pay now = deposit + preorder: " + rs.paid);
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
ok(exp.status === "expired" && exp.refunded === exp.paid, "reservation expiry (shortened) refunds Pay Now");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
