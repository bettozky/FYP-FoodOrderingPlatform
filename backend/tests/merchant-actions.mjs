// env: AI_RATE_PER_MIN=60
// "Do" actions in the merchant assistant: sold out / back in stock, busy mode on / off, last-hour deal.
// The AI (here: the offline fallback, as the test server has no OPENAI_API_KEY) can only PROPOSE an action.
// Nothing changes until the merchant answers "yes" on POST /api/ai/merchant/actions/:id.
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;
const chat = (token, message) => call("POST", "/api/ai/merchant/chat", token, { message });
const answer = (token, id, a) => call("POST", `/api/ai/merchant/actions/${id}`, token, { answer: a });

await call("POST", "/api/dev/reset");
const cust = await login("demo@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");
const dishes = async () => (await call("GET", "/api/merchant/dishes", merch)).body.dishes ?? [];
const dishNow = async (id) => (await dishes()).find((d) => d.id === id);
const dish = (await dishes()).find((d) => !d.soldOut && d.stock !== 0);

// 1. Proposing changes nothing.
let r = await chat(merch, `Mark ${dish.name} sold out`);
const first = r.body.confirm;
ok(r.status === 200 && typeof first?.id === "string" && first.summary.includes(dish.name), "'mark … sold out' gives a Yes/No card naming the dish");
ok(r.body.asksQuestion === true, "a proposal asks a question, so voice mode listens for the answer");
ok((await dishNow(dish.id)).soldOut === false, "proposing does not change the dish");

// 2. No = nothing changes; each proposal works once.
r = await answer(merch, first.id, "no");
ok(r.status === 200 && r.body.status === "cancelled" && (await dishNow(dish.id)).soldOut === false, "answering No changes nothing");
r = await answer(merch, first.id, "yes");
ok(r.status === 410, "a proposal can only be answered once");

// 3. Yes = the change happens.
r = await chat(merch, `Mark ${dish.name} sold out`);
r = await answer(merch, r.body.confirm.id, "yes");
ok(r.status === 200 && r.body.status === "done" && (await dishNow(dish.id)).soldOut === true, "answering Yes marks the dish sold out");
ok(typeof r.body.spoken === "string" && r.body.reply.includes(dish.name), "the result says what was done (and has a spoken version)");

// 4. The server checks proposals against real data.
r = await chat(merch, `Mark ${dish.name} sold out`);
ok(r.body.confirm === null && /already sold out/i.test(r.body.reply), "a dish that is already sold out gets an explanation, not a Yes/No card");

r = await chat(merch, `${dish.name} is back`);
r = await answer(merch, r.body.confirm.id, "yes");
ok(r.body.status === "done" && (await dishNow(dish.id)).soldOut === false, "'… is back' + Yes puts the dish back on sale");

// 5. Busy mode.
r = await chat(merch, "Turn busy mode on");
ok(/busy mode/i.test(r.body.confirm?.summary ?? ""), "'turn busy mode on' gives a Yes/No card");
r = await answer(merch, r.body.confirm.id, "yes");
ok((await call("GET", "/api/merchant/busy-mode", merch)).body.busyMode?.on === true, "Yes turns busy mode on");
r = await chat(merch, "Turn busy mode off");
await answer(merch, r.body.confirm.id, "yes");
ok((await call("GET", "/api/merchant/busy-mode", merch)).body.busyMode?.on === false, "and Yes turns it off again");

// 6. Last-hour deal (same limits as the Menu screen: 10-70% off).
r = await chat(merch, `30% off ${dish.name}`);
ok(/30%/.test(r.body.confirm?.summary ?? ""), "'30% off …' gives a Yes/No card for the deal");
await answer(merch, r.body.confirm.id, "yes");
ok((await dishNow(dish.id)).deal?.percent === 30, "Yes starts the 30% deal on that dish");
r = await chat(merch, `90% off ${dish.name}`);
ok(r.body.confirm === null && /10% to 70%/.test(r.body.reply), "a 90% deal is refused with the Menu screen's rule");

// 7. Malay works too.
r = await chat(merch, `Tandakan ${dish.name} habis`);
ok(r.body.confirm?.summary?.startsWith("Tandakan") && r.body.language === "ms", "Malay command gets a Malay Yes/No card");

// 8. Who may answer.
r = await call("POST", `/api/ai/merchant/actions/${r.body.confirm.id}`, cust, { answer: "yes" });
ok(r.status === 403, "customers cannot answer a merchant's proposal");
r = await answer(merch, "made-up-id", "yes");
ok(r.status === 410, "an unknown proposal id is refused");
r = await call("POST", "/api/ai/merchant/actions/whatever", merch, { answer: "maybe" });
ok(r.status === 400, "the answer must be yes or no");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exitCode = fails ? 1 : 0;
