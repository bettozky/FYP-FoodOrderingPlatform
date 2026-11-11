// env: GEO_BASE_URL=http://localhost:4555 GEO_MIN_GAP_MS=0
// Tests for the address helpers (address from a pin, place search). A small fake map service stands in for
// OpenStreetMap so the test needs no internet.
import http from "node:http";
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token) {
  const r = await fetch(API + path, { method, headers: token ? { Authorization: "Bearer " + token } : {} });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

let reverseCalls = 0;
let lastUa = "";
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  lastUa = String(req.headers["user-agent"] ?? "");
  res.setHeader("Content-Type", "application/json");
  if (u.pathname === "/reverse" && Math.abs(Number(u.searchParams.get("lon")) - 110.9) < 0.05) {
    // used by the "nearby" test: every spot has its own street, and the spot to the south has none
    if (Number(u.searchParams.get("lat")) < 1.699) { res.statusCode = 500; return res.end("{}"); }
    const lat = Number(u.searchParams.get("lat")), lon = Number(u.searchParams.get("lon"));
    return res.end(JSON.stringify({ lat: String(lat), lon: String(lon), address: { road: "Jalan " + Math.round(lat * 10000) + "-" + Math.round(lon * 10000), city: "Kuching" } }));
  }
  if (u.pathname === "/reverse") {
    reverseCalls++;
    if (u.searchParams.get("lat") === "0.1") { res.statusCode = 500; return res.end("{}"); }
    return res.end(JSON.stringify({ name: "Swinburne University", display_name: "Swinburne University, Jalan Simpang Tiga, Kuching, Sarawak, 93350, Malaysia", address: { road: "Jalan Simpang Tiga", suburb: "Batu Kawa", city: "Kuching", state: "Sarawak", postcode: "93350", country: "Malaysia" } }));
  }
  if (u.pathname === "/search") {
    if ((u.searchParams.get("q") ?? "").includes("fail")) { res.statusCode = 500; return res.end("{}"); }
    return res.end(JSON.stringify([
      { osm_type: "way", osm_id: 11, lat: "1.5324", lon: "110.3568", name: "Kuching Sentral", address: { road: "Jalan Sentral", suburb: "Petra Jaya", city: "Kuching" } },
      { osm_type: "node", osm_id: 12, lat: "bad", lon: "110.35", name: "Broken", address: {} },
    ]));
  }
  res.statusCode = 404; res.end("{}");
});
await new Promise((r) => fake.listen(4555, r));

try {
  await call("POST", "/api/dev/reset").catch(() => {});
  const login = await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "demo@scootmeal.test", password: "demo123" }) }).then((r) => r.json());
  const cust = login.token;
  const merch = (await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ahseng@scootmeal.test", password: "merchant123" }) }).then((r) => r.json())).token;

  let r = await call("GET", "/api/geo/reverse?lat=1.5&lng=110.3");
  ok(r.status === 401, "address lookup needs a login");
  r = await call("GET", "/api/geo/reverse?lat=1.5&lng=110.3", merch);
  ok(r.status === 403, "only customers can use the address lookup");

  r = await call("GET", "/api/geo/reverse?lat=1.5546&lng=110.3604", cust);
  ok(r.status === 200 && r.body.line === "Swinburne University, Jalan Simpang Tiga, Batu Kawa, Kuching" && r.body.approximate === false, "a pin gives a short readable address");
  ok(/ScootMeal/.test(lastUa), "the map service is told who is asking");
  r = await call("GET", "/api/geo/reverse?lat=1.5546&lng=110.3604", cust);
  ok(r.status === 200 && reverseCalls === 1, "the same pin is answered from the cache");

  r = await call("GET", "/api/geo/reverse?lat=0.1&lng=110.3", cust);
  ok(r.status === 200 && r.body.approximate === true && /Pinned location/.test(r.body.line), "if the map service fails, the pin still works with its coordinates");
  r = await call("GET", "/api/geo/reverse?lat=abc&lng=110.3", cust);
  ok(r.status === 400, "bad coordinates are refused");
  r = await call("GET", "/api/geo/reverse?lat=95&lng=110.3", cust);
  ok(r.status === 400, "out-of-range latitude is refused");

  r = await call("GET", "/api/geo/search?q=kuching%20sentral", cust);
  ok(r.status === 200 && r.body.results.length === 1 && r.body.results[0].title === "Kuching Sentral" && r.body.results[0].lat === 1.5324, "place search returns matches with coordinates and drops broken ones");
  ok(r.body.results[0].line.includes("Petra Jaya"), "each result has a readable address");
  r = await call("GET", "/api/geo/search?q=k", cust);
  ok(r.status === 400, "search needs at least 2 letters");
  r = await call("GET", "/api/geo/search?q=please%20fail", cust);
  ok(r.status === 502 && /pin/i.test(r.body.error ?? r.body.message ?? ""), "if search is down the customer is told to move the pin");

  r = await call("GET", "/api/geo/nearby?lat=1.7&lng=110.9", cust);
  ok(r.status === 200 && r.body.results.length === 4, "nearby gives the different addresses around the pin and skips a spot that failed");
  ok(r.body.results.every((x) => x.line && Number.isFinite(x.lat) && Number.isFinite(x.distance)), "each nearby address has a line, coordinates and a distance");
  ok(r.body.results.every((x, i, a) => i === 0 || a[i - 1].distance <= x.distance) && r.body.results[0].distance < 5, "nearby addresses are sorted by distance (the pin's own spot first)");
  r = await call("GET", "/api/geo/nearby?lat=1.0&lng=110.9", cust);
  ok(r.status === 502, "if nothing nearby can be found the customer is told they can type the address");
  r = await call("GET", "/api/geo/nearby?lat=x&lng=110.9", cust);
  ok(r.status === 400, "nearby refuses bad coordinates");
} finally {
  fake.close();
}
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
