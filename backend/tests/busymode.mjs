// Sprint 3 busy mode / auto-pause (API side).
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;
const cust = await login("demo@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");
const order = (extra = {}) => call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d1", mode: "takeaway", qty: 1 }], ...extra });

let r = await call("GET", "/api/merchant/busy-mode", merch);
ok(r.status === 200 && r.body.busyMode.on === false && typeof r.body.waitMinutes === "number", "busy mode is off to start with");

// Ah Seng's prep time alone (12 min) is over a 5-minute limit, so busy mode kicks in straight away.
r = await call("PUT", "/api/merchant/busy-mode", merch, { on: true, limitMinutes: 5, action: "pause" });
ok(r.status === 200 && r.body.ordersPaused === true, "pause mode on, over the limit: orders paused");
r = await call("GET", "/api/merchants/m1", cust);
const shop = r.body.merchant ?? r.body;
ok(shop.ordersPaused === true && shop.waitLimit === 5, "customers see the stall is paused");
r = await order({ acceptLongWait: true });
ok(r.status === 409 && /paused/.test(r.body.error), "a paused stall refuses new orders");

r = await call("PUT", "/api/merchant/busy-mode", merch, { on: true, limitMinutes: 5, action: "warn" });
ok(r.body.longWaitWarning === true && r.body.ordersPaused === false, "warn mode: warning instead of pause");
r = await order();
ok(r.status === 409 && /OK waiting/.test(r.body.error), "warn mode: refused until the customer accepts the wait");
r = await order({ acceptLongWait: true });
ok(r.status === 201, "after 'I'm OK waiting' the order goes through");

r = await call("PUT", "/api/merchant/busy-mode", merch, { on: true, limitMinutes: 120, action: "pause" });
ok(r.body.ordersPaused === false, "a high limit: back under it, orders open again by themselves");
r = await order();
ok(r.status === 201, "orders go through normally under the limit");

r = await call("PUT", "/api/merchant/busy-mode", merch, { on: true, limitMinutes: 1, action: "pause" });
ok(r.status === 400, "limit below 5 minutes is refused");
r = await call("PUT", "/api/merchant/busy-mode", cust, { on: false, limitMinutes: 30, action: "warn" });
ok(r.status === 403, "customers cannot change busy mode");
await call("PUT", "/api/merchant/busy-mode", merch, { on: false, limitMinutes: 30, action: "warn" });

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
