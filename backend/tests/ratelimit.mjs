// env: AUTH_RATE_PER_MIN=5
// Login attempts are limited per address, so password guessing is slow.
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
const login = (password) => fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "demo@scootmeal.test", password }) });

const codes = [];
for (let i = 0; i < 8; i++) codes.push((await login("wrong")).status);
ok(codes.slice(0, 5).every((c) => c === 401), "the first attempts are answered normally");
ok(codes.slice(5).every((c) => c === 429), "attempts above the limit get 429 Too Many Requests");
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
