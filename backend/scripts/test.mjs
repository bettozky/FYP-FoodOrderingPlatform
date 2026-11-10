// `npm test`: for every file in tests/, starts a fresh server on a spare port with short timers, runs the file, stops the server.
// Memory mode by default. To run the same tests against a real database: TEST_DATABASE_URL=postgres://... npm test
// A test file can change settings with a first line like:  // env: AUTH_RATE_PER_MIN=5
import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const PORT = process.env.TEST_PORT ?? "3999";
const API = `http://localhost:${PORT}`;
const only = process.argv[2];

async function runFile(file) {
  const extra = Object.fromEntries((/^\/\/ env: (.+)$/m.exec(readFileSync(resolve(root, "tests", file), "utf8"))?.[1] ?? "").split(/\s+/).filter(Boolean).map((kv) => kv.split("=")));
  const env = {
    ...process.env, PORT, NODE_ENV: "test", ENABLE_DEV_RESET: "1", ORDER_RESPONSE_MS: "3000", PAYMENT_WINDOW_MS: "3000", CALL_RING_MS: "2000",
    RESERVATION_RESPONSE_MS: "3000", DELIVERY_STAGE_MS: "500", SEED_DEMO_DATA: "true", OPENAI_API_KEY: "", AUTH_RATE_PER_MIN: "1000",
    SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", DATABASE_URL: process.env.TEST_DATABASE_URL ?? "", ...extra,
  };
  const server = spawn("npx", ["tsx", "src/server.ts"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  const stop = () => new Promise((res) => { server.on("exit", res); try { process.kill(-server.pid, "SIGTERM"); } catch { res(); } setTimeout(res, 3000); });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500));
    up = await fetch(`${API}/api/health`).then((r) => r.ok).catch(() => false);
  }
  if (!up) { console.error("Server did not start:\n" + log); await stop(); return 1; }
  const code = await new Promise((res) => spawn("node", [resolve(root, "tests", file)], { env: { ...process.env, API_URL: API }, stdio: "inherit" }).on("exit", res));
  await stop();
  return code;
}

let failed = 0;
for (const f of readdirSync(resolve(root, "tests")).filter((x) => x.endsWith(".mjs") && (!only || x.includes(only)))) {
  console.log(`\n=== ${f} ===`);
  if (await runFile(f)) failed++;
}
console.log(failed ? `\n${failed} test file(s) FAILED` : "\nAll test files passed.");
process.exit(failed ? 1 : 0);
