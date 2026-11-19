// Sprint 3 prep forecast (API side), on Ah Seng's 4 weeks of demo history.
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

let r = await call("GET", "/api/merchant/forecast", merch);
const f = r.body.forecast;
ok(r.status === 200 && /^\d{4}-\d{2}-\d{2}$/.test(f?.date), "tomorrow's forecast");
ok(f.dates.length >= 3 && f.dates.every((d) => new Date(d + "T00:00:00Z").getUTCDay() === f.weekday), "built from past days on the same weekday");
ok(f.dishes.length > 0 && f.dishes.every((d) => d.history.length === f.dates.length && d.expected >= 0 && d.low <= d.high), "a forecast per dish with its history and range");
ok(f.dishes.every((d, i, a) => i === 0 || a[i - 1].expected >= d.expected), "busiest dish first");
ok(f.expectedOrders > 0 && typeof f.rushHour === "number", "expected orders and the rush hour");

r = await call("GET", "/api/merchant/forecast?day=3", merch);
ok(r.status === 200 && r.body.forecast.weekday === 3, "any weekday can be picked (3 = Wednesday)");
r = await call("GET", "/api/merchant/forecast?day=9", merch);
ok(r.status === 400, "an unknown day is refused");
r = await call("GET", "/api/merchant/forecast", cust);
ok(r.status === 403, "customers cannot see a stall's forecast");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
