// env: ENABLE_DEV_RESET=0
// The wipe-everything route must not exist unless it was switched on on purpose.
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
const r = await fetch(API + "/api/dev/reset", { method: "POST" });
await r.text(); // read the body so the connection closes before exit (Node on Windows crashes otherwise)
ok(r.status === 404, "POST /api/dev/reset is not available by default (got " + r.status + ")");
const login = await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "demo@scootmeal.test", password: "demo123" }) });
await login.text(); // same here
ok(login.status === 200, "demo data is still there after the attempt");
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exitCode = fails ? 1 : 0;