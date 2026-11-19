// env: BUZZ_GAP_MS=600
// Sprint 3 "phone as a pickup buzzer" (API side): the ready notice carries what the full-screen buzzer shows,
// and the stall can buzz again until the customer taps "Collected".
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;
const cust = await login("demo@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");

let r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d1", mode: "takeaway", qty: 1 }] });
const o = r.body.order;
await call("POST", `/api/merchant/orders/${o.id}/respond`, merch, { accept: true });
await call("POST", `/api/orders/${o.id}/pay`, cust, { card: { number: "4242 4242 4242 4242" } });

r = await call("POST", `/api/merchant/orders/${o.id}/buzz`, merch, { mode: "takeaway" });
ok(r.status === 409, "cannot buzz before the food is ready");

await call("POST", `/api/merchant/orders/${o.id}/ready`, merch, { mode: "takeaway" });
r = await call("GET", "/api/notifications", cust);
const n = r.body.notifications.find((x) => x.type === "food_ready" && x.data?.orderId === o.id);
ok(!!n, "customer gets a food_ready notice");
ok(n?.data?.merchantName && n?.data?.stallNo && n?.data?.merchantId === "m1", "notice has the stall name, counter and stall id for the buzzer screen");
ok(n?.data?.buzzCount === 1 && typeof n?.data?.buzzedAt === "number", "first buzz is counted");

r = await call("POST", `/api/merchant/orders/${o.id}/buzz`, merch, { mode: "takeaway" });
ok(r.status === 429, "buzzing again straight away is refused (no spamming)");
await sleep(700);
r = await call("POST", `/api/merchant/orders/${o.id}/buzz`, merch, { mode: "takeaway" });
ok(r.status === 200 && r.body.buzzCount === 2, "'Buzz again' works after the short gap");
r = await call("GET", "/api/notifications", cust);
const n2 = r.body.notifications.find((x) => x.id === n.id);
ok(n2?.data?.buzzCount === 2 && n2.data.buzzedAt > n.data.buzzedAt, "customer's notice shows the new buzz, so the phone rings again");

r = await call("POST", `/api/merchant/orders/${o.id}/buzz`, merch, { mode: "dine_in" });
ok(r.status === 409, "nothing to buzz for a mode with no ready food");
r = await call("POST", `/api/merchant/orders/${o.id}/buzz`, merch, { mode: "nope" });
ok(r.status === 400, "bad mode is refused");
r = await call("POST", `/api/merchant/orders/${o.id}/buzz`, cust, { mode: "takeaway" });
ok(r.status === 403 || r.status === 401, "customers cannot buzz");

await call("POST", `/api/orders/${o.id}/collected`, cust, { mode: "takeaway" });
await sleep(700);
r = await call("POST", `/api/merchant/orders/${o.id}/buzz`, merch, { mode: "takeaway" });
ok(r.status === 409, "after 'Collected' the buzzer stops for good");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
