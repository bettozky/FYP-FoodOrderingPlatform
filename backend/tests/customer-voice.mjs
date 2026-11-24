// env: PAYMENT_WINDOW_MS=600000 ORDER_RESPONSE_MS=600000 AI_RATE_PER_MIN=60
// Customer assistant voice extras (POST /api/ai/chat): spoken text, language, and the order / pay actions.
// The test server has no OPENAI_API_KEY, so the offline fallback answers; it understands "where is my order"
// and "I want to pay". The server only ever uses this customer's own orders (from the login token).
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;
const chat = (token, message) => call("POST", "/api/ai/chat", token, { message });
const order = async (token) => (await call("POST", "/api/orders", token, { merchantId: "m1", items: [{ dishId: "d1", mode: "dine_in", qty: 1 }] })).body.order;

await call("POST", "/api/dev/reset");
const cust = await login("demo@scootmeal.test", "demo123");
const other = await login("aisyah@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");

// Plain answers now carry the voice fields.
let r = await chat(cust, "hi");
ok(r.status === 200 && typeof r.body.reply === "string" && typeof r.body.spoken === "string", "replies include a spoken version");
ok(r.body.language === "en" && r.body.asksQuestion === false && r.body.confirm === null && r.body.navigate === null && r.body.choices === null, "a plain answer has no question, action or list");

// Pay: explained when there is nothing to pay.
r = await chat(cust, "I want to pay");
ok(r.body.confirm === null && /no orders waiting for payment/i.test(r.body.reply), "nothing to pay: it says so instead of asking");

const o1 = await order(cust);
ok(o1?.status === "awaiting_merchant", "(setup) customer sent an order request");
r = await chat(cust, "I want to pay");
ok(r.body.confirm === null && /hasn't confirmed/i.test(r.body.reply), "order not confirmed yet: it says the stall hasn't confirmed");

await call("POST", `/api/merchant/orders/${o1.id}/respond`, merch, { accept: true });
r = await chat(cust, "I want to pay");
ok(r.body.confirm?.kind === "pay" && r.body.confirm.orderId === o1.id, "one confirmed order: a Yes/No question to open payment for it");
ok(/Ah Seng/i.test(r.body.confirm?.summary ?? "") && /RM\d/.test(r.body.confirm?.summary ?? "") && r.body.asksQuestion === true, "the question names the stall and the amount, and waits for an answer");
ok(!/RM\d/.test(r.body.spoken) && /ringgit/.test(r.body.spoken), "the spoken question says money in words");

// Order status opens the tracking screen straight away.
r = await chat(cust, "Where is my order?");
ok(r.body.navigate?.screen === "OrderTracking" && r.body.navigate.orderId === o1.id && r.body.confirm === null, "'where is my order' opens that order's tracking screen without asking");

// Two orders to pay: it asks which one.
const o2 = await order(cust);
await call("POST", `/api/merchant/orders/${o2.id}/respond`, merch, { accept: true });
r = await chat(cust, "I want to pay");
const ids = (r.body.choices?.options ?? []).map((o) => o.orderId).sort();
ok(r.body.choices?.kind === "pay" && ids.length === 2 && ids.includes(o1.id) && ids.includes(o2.id) && r.body.confirm === null, "two orders to pay: it lists both and asks which one");
r = await chat(cust, "Saya nak bayar");
ok(r.body.language === "ms" && /Pesanan mana/.test(r.body.choices?.question ?? ""), "the same in Malay");

// Privacy: another customer never sees these orders.
r = await chat(other, "I want to pay");
ok(r.body.confirm === null && r.body.choices === null && /no orders waiting/i.test(r.body.reply), "another customer cannot pay these orders");
r = await chat(other, "Where is my order?");
ok(r.body.navigate === null && /no active orders/i.test(r.body.reply), "another customer is not sent to these orders");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exitCode = fails ? 1 : 0;
