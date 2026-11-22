// Chart cards in the merchant assistant (POST /api/ai/merchant/chat returns `card`).
// The AI only picks which chart fits; the server builds it from the stall's own orders.
// The test server has no OPENAI_API_KEY, so the offline fallback picks the chart from the question's words.
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;
const chat = (token, message) => call("POST", "/api/ai/merchant/chat", token, { message });
const sum = (bars) => Math.round(bars.reduce((s, b) => s + b.value, 0) * 100) / 100;

await call("POST", "/api/dev/reset");
const merch = await login("ahseng@scootmeal.test", "merchant123");
const ownDishes = new Set(((await call("GET", "/api/merchant/dishes", merch)).body.dishes ?? []).map((d) => d.name));

let r = await chat(merch, "Show my sales this week");
let c = r.body.card;
ok(r.status === 200 && c?.type === "chart" && c.kind === "last_7_days", "a question about this week gets the 7-day sales chart");
ok(c?.bars?.length === 7 && c.bars[6].label === "Today" && c.unit === "RM" && c.layout === "columns", "the 7-day chart has 7 columns in RM, ending with today");
ok(c?.bars?.every((b) => typeof b.value === "number" && b.value >= 0) && sum(c.bars) === c.total, "every day has a number and the total adds up");
const today = (await call("GET", "/api/merchant/stats?period=today", merch)).body;
ok(c?.bars?.[6]?.value === Number(today.revenue), "the chart's Today column matches the dashboard's sales today (RM" + today.revenue + ")");

r = await chat(merch, "Which dish sells best?");
c = r.body.card;
ok(c?.kind === "best_sellers_7_days" && c.unit === "sold" && c.layout === "rows", "a best-seller question gets the best sellers chart as rows");
ok(c?.bars?.length > 0 && c.bars.length <= 5 && c.bars.every((b, i, a) => i === 0 || a[i - 1].value >= b.value), "best sellers: at most 5 dishes, most sold first");
ok(c?.bars?.every((b) => ownDishes.has(b.label)), "best sellers only lists this stall's own dishes");

r = await chat(merch, "Jualan ikut jam hari ini");
ok(r.body.card?.kind === "today_by_hour" && r.body.card.bars.length === 7, "Malay 'by hour' question gets today's 2-hour sales chart");
r = await chat(merch, "本周销售怎么样？");
ok(r.body.card?.kind === "last_7_days", "Chinese 'this week' question gets the 7-day chart");

r = await chat(merch, "Hello");
ok(r.status === 200 && r.body.card === null, "an ordinary question has no chart");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exitCode = fails ? 1 : 0;