// Sprint 3 diet and allergy profile (API side): saved once per customer, cleaned on the way in.
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

let r = await call("GET", "/api/diet", cust);
ok(r.status === 200 && r.body.diet.allergens.length === 0 && r.body.diet.hideUnsuitable === false, "empty profile to start with");

r = await call("PUT", "/api/diet", cust, { allergens: ["Peanuts", "Glitter", "Peanuts", "Milk"], prefs: ["vegetarian", "keto"], hideUnsuitable: true });
ok(r.status === 200, "profile saved");
ok(JSON.stringify(r.body.diet.allergens) === JSON.stringify(["Peanuts", "Milk"]), "unknown and repeated allergens are dropped");
ok(JSON.stringify(r.body.diet.prefs) === JSON.stringify(["vegetarian"]), "unknown diet options are dropped");
ok(r.body.diet.hideUnsuitable === true, "hide setting saved");

r = await call("GET", "/api/diet", cust);
ok(r.body.diet.allergens.includes("Peanuts") && r.body.diet.prefs.includes("vegetarian"), "profile is there next time");

r = await call("PUT", "/api/diet", cust, { allergens: "Peanuts", prefs: [] });
ok(r.status === 400, "allergens must be a list");
r = await call("GET", "/api/diet", merch);
ok(r.status === 403, "only customers have a diet profile");

r = await call("GET", "/api/dishes?merchantId=m2", cust);
ok(r.body.dishes.some((d) => d.id === "d3" && d.allergens?.includes("Peanuts")), "demo dishes list their allergens (Nasi Lemak has peanuts)");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
