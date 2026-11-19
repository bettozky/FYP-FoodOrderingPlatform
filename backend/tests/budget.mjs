// Sprint 3 weekly budget (API side): set, change and remove the customer's weekly limit.
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

let r = await call("GET", "/api/budget", cust);
ok(r.status === 200 && r.body.weeklyBudget === null, "no budget to start with");
r = await call("PUT", "/api/budget", cust, { weeklyBudget: 50 });
ok(r.status === 200 && r.body.weeklyBudget === 50, "budget set to RM 50");
r = await call("GET", "/api/budget", cust);
ok(r.body.weeklyBudget === 50, "budget is kept");
r = await call("PUT", "/api/budget", cust, { weeklyBudget: "45.555" });
ok(r.status === 200 && r.body.weeklyBudget === 45.56, "amounts are rounded to sen");
for (const bad of [0, -5, 999999, "abc", true]) {
  r = await call("PUT", "/api/budget", cust, { weeklyBudget: bad });
  ok(r.status === 400, `refuses ${JSON.stringify(bad)}`);
}
r = await call("PUT", "/api/budget", cust, { weeklyBudget: null });
ok(r.status === 200 && r.body.weeklyBudget === null, "budget removed");
r = await call("GET", "/api/budget", merch);
ok(r.status === 403, "only customers have a budget");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
