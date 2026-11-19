// env: CORS_ORIGINS=http://localhost:5173
// Security checks (Sprint 3, week 1): SQL injection, XSS, security headers, CORS, input limits and upload content.
// Run with the others: npm test   (or only this file: npm test security)
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body, headers = {}) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, headers: r.headers, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;

await call("POST", "/api/dev/reset");
const cust = await login("demo@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");
ok(!!cust && !!merch, "demo customer and merchant log in");

// ---------- 1. SQL injection ----------
// Every value reaches the database as a parameter ($1, $2 ...), never pasted into the SQL text.
for (const email of ["' OR '1'='1", "demo@scootmeal.test' --", "admin@scootmeal.test'; DROP TABLE users; --"]) {
  const r = await call("POST", "/api/auth/login", null, { email, password: "' OR '1'='1" });
  ok(r.status === 401 && !r.body.token, `SQL injection in login is refused: ${email}`);
}
let r = await call("POST", "/api/auth/login", null, { email: { $ne: null }, password: { $ne: null } });
ok(r.status === 401 && !r.body.token, "login with objects instead of text (NoSQL-style injection) is refused");
r = await call("GET", "/api/search?q=" + encodeURIComponent("' OR 1=1 --"));
ok(r.status === 200 && r.body.merchants.length === 0 && r.body.dishes.length === 0, "SQL injection in search finds nothing instead of every shop");
r = await call("GET", "/api/search?q=noodle");
ok(r.status === 200 && r.body.merchants.length + r.body.dishes.length >= 1, "normal search still works");
ok((await login("demo@scootmeal.test", "demo123")) !== undefined, "users still exist after the DROP TABLE attempt");

// ---------- 2. XSS (stored script) ----------
const script = `<script>alert("xss")</script><img src=x onerror=alert(1)>`;
r = await call("PATCH", "/api/auth/me", cust, { name: script });
ok(r.status === 200 && r.body.user.name === script, "HTML in a name is stored and returned as plain text, not run");
ok((r.headers.get("content-type") ?? "").startsWith("application/json"), "API answers are JSON, so a browser never treats them as a web page");
await call("PATCH", "/api/auth/me", cust, { name: "Demo Student" });
for (const avatar of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "http://tracker.example/pixel.png", "<svg onload=alert(1)>"]) {
  r = await call("PATCH", "/api/auth/me", cust, { avatar });
  ok(r.status === 400, `unsafe avatar link refused: ${avatar.slice(0, 30)}`);
}
r = await call("PATCH", "/api/auth/me", cust, { avatar: "🍜" });
ok(r.status === 200 && r.body.user.avatar === "🍜", "emoji avatar still allowed");
r = await call("PATCH", "/api/auth/me", cust, { avatar: "https://example.com/me.png" });
ok(r.status === 200 && r.body.user.avatar === "https://example.com/me.png", "https:// avatar link still allowed");

// A web page renamed to .png must not be stored as a public shop photo (it would be served from our storage).
const upload = (bytes, type, name) => { const f = new FormData(); f.append("kind", "logo"); f.append("file", new Blob([bytes], { type }), name); return fetch(API + "/api/merchant/uploads", { method: "POST", headers: { Authorization: "Bearer " + merch }, body: f }); };
ok((await upload("<html><script>alert(1)</script></html>", "image/png", "logo.png")).status === 400, "HTML file labelled as a PNG is refused");
ok((await upload("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>", "image/svg+xml", "logo.svg")).status === 400, "SVG (can carry scripts) is refused");
const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
ok((await upload(png, "image/png", "logo.png")).status === 201, "a real PNG logo is still accepted");

// ---------- 3. Security headers (helmet) ----------
const h = (await fetch(API + "/api/health")).headers;
ok(!h.has("x-powered-by"), "server does not say it runs Express (no X-Powered-By)");
ok(h.get("x-content-type-options") === "nosniff", "X-Content-Type-Options: nosniff");
ok(/SAMEORIGIN|DENY/i.test(h.get("x-frame-options") ?? ""), "X-Frame-Options set (no clickjacking in frames)");
ok(/default-src 'self'/.test(h.get("content-security-policy") ?? ""), "Content-Security-Policy set");
ok(/max-age=\d+/.test(h.get("strict-transport-security") ?? ""), "Strict-Transport-Security set (HTTPS only once hosted)");
const media = await fetch(API + "/media/dishes/d1.jpg");
ok(media.status === 200 && media.headers.get("cross-origin-resource-policy") === "cross-origin", "dish photos can still be shown by the apps and web admin");

// ---------- 4. CORS: only the web admin's address may call the API from a browser ----------
r = await call("GET", "/api/health", null, undefined, { Origin: "http://localhost:5173" });
ok(r.headers.get("access-control-allow-origin") === "http://localhost:5173", "allowed web page (CORS_ORIGINS) may call the API");
r = await call("GET", "/api/health", null, undefined, { Origin: "https://evil.example" });
ok(!r.headers.get("access-control-allow-origin"), "other web pages are not allowed (no Access-Control-Allow-Origin)");
const pre = await fetch(API + "/api/orders", { method: "OPTIONS", headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization" } });
ok(!pre.headers.get("access-control-allow-origin"), "other web pages cannot send a signed-in request (preflight refused)");
r = await call("GET", "/api/health");
ok(r.status === 200, "phone apps (no Origin header) are not affected");

// ---------- 5. Input limits ----------
r = await call("PATCH", "/api/auth/me", cust, { name: "A".repeat(5000) });
ok(r.status === 400, "very long text is refused (name over 80 characters)");
r = await call("PATCH", "/api/auth/me", cust, { name: ["array", "not", "text"] });
ok(r.status === 400, "wrong data type is refused (array instead of text)");
const big = await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "x".repeat(2 * 1024 * 1024) }) });
ok(big.status === 413, "request body over 1 MB is refused (413)");
const broken = await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json" });
const brokenBody = await broken.text();
ok(broken.status === 400 && !/at .*\.(js|ts):\d+/.test(brokenBody), "broken JSON gets 400 without leaking a stack trace");

// ---------- 6. Errors do not leak internals ----------
r = await call("GET", "/api/does-not-exist");
ok(r.status === 404 && JSON.stringify(r.body) === JSON.stringify({ error: "Not found" }), "unknown URL gets a plain 404");
r = await call("GET", "/api/auth/me", "not-a-real-token");
ok(r.status === 401, "fake login token refused");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
