// Sprint 3 last-hour deals (API side).
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

let r = await call("GET", "/api/deals");
ok(r.status === 200 && Array.isArray(r.body.deals), "deals list opens without logging in");
const before = r.body.deals.length;

r = await call("POST", "/api/merchant/deals/d1", merch, { percent: 30, minutes: 60 });
ok(r.status === 200 && r.body.dish.deal.percent === 30, "Ah Seng puts Beef Noodle Soup (RM 8.50) on a 30% deal");

r = await call("GET", "/api/deals");
const deal = r.body.deals.find((x) => x.dish.id === "d1");
ok(r.body.deals.length === before + 1 && deal, "the deal shows in the Home row");
ok(deal?.dish.price === 6 && deal?.dish.originalPrice === 8.5 && deal?.dish.dealPercent === 30 && deal?.dish.dealEndsAt > Date.now(), "customers see RM 6.00, with RM 8.50 crossed out and the end time");
ok(deal?.merchant?.name === "Ah Seng Noodle House", "with the stall");
ok(!("deal" in deal.dish) && !("cost" in deal.dish), "no raw deal or cost data sent to customers");

r = await call("GET", "/api/dishes?merchantId=m1", cust);
ok(r.body.dishes.find((d) => d.id === "d1")?.price === 6, "the stall menu shows the deal price too");

r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d1", mode: "takeaway", qty: 2 }] });
ok(r.status === 201 && r.body.order.items[0].price === 6 && r.body.order.subtotal === 12, "an order made during the deal is charged the deal price");

r = await call("DELETE", "/api/merchant/deals/d1", merch);
ok(r.status === 200 && !r.body.dish.deal, "the stall can end the deal early");
r = await call("GET", "/api/dishes?merchantId=m1", cust);
ok(r.body.dishes.find((d) => d.id === "d1")?.price === 8.5, "after it ends the normal price is back");

r = await call("POST", "/api/merchant/deals/d1", merch, { percent: 95, minutes: 60 });
ok(r.status === 400, "more than 70% off is refused");
r = await call("POST", "/api/merchant/deals/d4", merch, { percent: 30, minutes: 60 });
ok(r.status === 404, "a stall cannot put another stall's dish on a deal");
r = await call("POST", "/api/merchant/deals/d1", cust, { percent: 30, minutes: 60 });
ok(r.status === 403, "customers cannot make deals");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
