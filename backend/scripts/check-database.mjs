// `npm run db:check`: proves the database really keeps your data.
// Starts the server on DATABASE_URL, creates a customer, an address and an order, stops the server, starts it again,
// and checks everything (including the login token and the next order number) is still there.
//   DATABASE_URL=postgres://... npm run db:check        (uses a scratch copy of the demo data; run it on a TEST database)
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const url = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL to a TEST database first."); process.exit(1); }
const PORT = "3998";
const API = `http://localhost:${PORT}`;
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
const call = async (method, path, token, body) => {
  const r = await fetch(API + path, { method, headers: { ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

function start() {
  const server = spawn("npx", ["tsx", "src/server.ts"], { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PORT, DATABASE_URL: url, NODE_ENV: "test", PERSIST_INTERVAL_MS: "500", OPENAI_API_KEY: "", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" } });
  server.log = "";
  server.stdout.on("data", (d) => (server.log += d));
  server.stderr.on("data", (d) => (server.log += d));
  return server;
}
const waitUp = async () => { for (let i = 0; i < 60; i++) { if (await fetch(API + "/api/health").then((r) => r.ok).catch(() => false)) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const stop = (s) => new Promise((res) => { s.on("exit", res); process.kill(-s.pid, "SIGTERM"); setTimeout(res, 5000); });

let s = start();
ok(await waitUp(), "server starts and connects to the database");
await call("POST", "/api/dev/reset");
const reg = await call("POST", "/api/auth/register", null, { name: "Persist Test", email: "persist@x.com", password: "secret1", dob: "2000-01-01" });
const token = reg.body.token;
await call("POST", "/api/addresses", token, { label: "Hostel", line: "Hostel A", lat: 1.55, lng: 110.36 });
await call("PUT", "/api/favourites/dishes/d1", token);
const placed = await call("POST", "/api/orders", token, { merchantId: "m5", items: [{ dishId: "d10", mode: "takeaway", qty: 1 }] });
const orderId = placed.body.order?.id;
ok(placed.status === 201 && orderId, "order placed: " + orderId);
// job application with a CV, a shop announcement and a profile photo (these use their own tables)
const merch = (await call("POST", "/api/auth/login", null, { email: "ahseng@scootmeal.test", password: "merchant123" })).body.token;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
const f = new FormData();
for (const [k, v] of Object.entries({ fullName: "Persist Test", email: "persist@x.com", phone: "+60 12-345 6789", availableDays: JSON.stringify(["mon"]), hoursPerWeek: 10, eligibleToWork: true })) f.append(k, String(v));
f.append("resume", new Blob([pdf], { type: "application/pdf" }), "cv.pdf");
const applied = await call("POST", "/api/jobs/j1/applications", token, f);
const appId = applied.body.application?.id;
ok(applied.status === 201 && appId, "job application sent: " + appId);
const ann = await call("POST", "/api/merchant/announcements", merch, { title: "Persist promo", body: "Half price noodles", pinned: true });
ok(ann.status === 201, "shop announcement posted");
const av = new FormData();
av.append("file", new Blob([png], { type: "image/png" }), "me.png");
const avatar = await call("POST", "/api/auth/me/avatar", token, av);
ok(avatar.status === 201 && avatar.body.avatar, "profile photo uploaded");
await new Promise((r) => setTimeout(r, 1500)); // let the autosave run
await stop(s); // graceful stop also saves

s = start();
ok(await waitUp(), "server starts again");
let r = await call("GET", "/api/auth/me", token);
ok(r.status === 200 && r.body.user.email === "persist@x.com", "the same login token still works after a restart");
r = await call("GET", "/api/addresses", token);
ok(r.body.addresses?.length === 1, "saved address survived");
r = await call("GET", "/api/favourites", token);
ok(r.body.dishIds?.includes("d1"), "favourite survived");
r = await call("GET", "/api/orders/" + orderId, token);
ok(r.status === 200 && r.body.order.status === "awaiting_merchant", "the order survived with its status");
r = await call("GET", "/api/merchant/applications/" + appId, merch);
ok(r.status === 200 && r.body.application.fullName === "Persist Test" && r.body.application.documents.resume, "job application and its CV survived");
r = await call("GET", "/api/announcements");
ok(r.body.announcements.some((a) => a.title === "Persist promo" && a.pinned), "announcement survived");
r = await call("GET", "/api/auth/me", token);
ok(r.body.user.avatar === avatar.body.avatar, "profile photo link survived");
r = await call("POST", "/api/orders", token, { merchantId: "m5", items: [{ dishId: "d10", mode: "takeaway", qty: 1 }] });
ok(r.status === 201 && r.body.order.id !== orderId && Number(r.body.order.id.slice(3)) > Number(orderId.slice(3)), "next order number continues after the saved ones: " + r.body.order?.id);
r = await call("GET", "/api/merchants");
ok(r.body.merchants.length === 5, "shops survived");
r = await call("POST", "/api/auth/login", null, { email: "demo@scootmeal.test", password: "demo123" });
ok(r.status === 200, "seeded demo login still works");
ok(!/could not save/i.test(s.log), "no save errors in the server log");
await stop(s);
console.log(fails ? `\n${fails} FAILED` : "\nDATABASE CHECK PASSED");
process.exit(fails ? 1 : 0);
