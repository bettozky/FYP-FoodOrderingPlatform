// Keeps PostgreSQL in step with the in-memory `db`.
//
//   load()  at start-up: reads every table into `db`.
//   flush() compares every record with what was saved last time and writes only what changed (and deletes what is gone).
//
// flush() runs after every API call that changes data, every PERSIST_INTERVAL_MS (for timer-driven changes such as
// expired orders), and once more on shutdown. A failed save is simply retried on the next run.
import { env } from "../../config/env.js";
import { clearDb } from "../db.js";
import { COLLECTIONS, type Collection } from "./collections.js";
import { getPool } from "./pool.js";

const CHUNK = 500;
/** table -> id -> JSON text last written to (or read from) the database */
const saved = new Map<string, Map<string, string>>(COLLECTIONS.map((c) => [c.table, new Map()]));

export async function load(): Promise<number> {
  const pool = getPool();
  clearDb();
  let total = 0;
  for (const c of COLLECTIONS) {
    const rows = (await pool.query(`SELECT data FROM ${c.table} ORDER BY seq`)).rows as { data: unknown }[];
    for (const r of rows) c.add(r.data);
    c.afterLoad?.();
    total += rows.length;
  }
  rememberCurrent();
  return total;
}

/** Marks everything currently in memory as already saved (used right after load). */
function rememberCurrent() {
  for (const c of COLLECTIONS) {
    const m = saved.get(c.table)!;
    m.clear();
    for (const item of c.items()) m.set(c.idOf(item), JSON.stringify(item));
  }
}

async function writeTable(c: Collection) {
  const last = saved.get(c.table)!;
  const current = new Map<string, string>();
  const changed: { id: string; json: string; item: any }[] = [];
  for (const item of c.items()) {
    const id = c.idOf(item);
    const json = JSON.stringify(item);
    current.set(id, json);
    if (last.get(id) !== json) changed.push({ id, json, item });
  }
  const removed = [...last.keys()].filter((id) => !current.has(id));
  if (!changed.length && !removed.length) return;

  const cols = c.columns;
  const colList = cols.map((x) => x.name).join(", ");
  const recordDef = ["id text", "data jsonb", ...cols.map((x) => `${x.name} ${x.type}`)].join(", ");
  const insert =
    `INSERT INTO ${c.table} (id, data${cols.length ? ", " + colList : ""}) ` +
    `SELECT id, data${cols.length ? ", " + colList : ""} FROM jsonb_to_recordset($1::jsonb) AS r(${recordDef}) ` +
    `ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, ${cols.map((x) => `${x.name} = EXCLUDED.${x.name}`).concat("updated_at = now()").join(", ")}`;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    if (removed.length) await client.query(`DELETE FROM ${c.table} WHERE id = ANY($1::text[])`, [removed]);
    for (let i = 0; i < changed.length; i += CHUNK) {
      const rows = changed.slice(i, i + CHUNK).map(({ id, item }) => {
        const row: Record<string, unknown> = { id, data: item };
        for (const col of cols) row[col.name] = col.get(item) ?? null;
        return row;
      });
      await client.query(insert, [JSON.stringify(rows)]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  for (const id of removed) last.delete(id);
  for (const { id, json } of changed) last.set(id, json);
}

let chain: Promise<void> = Promise.resolve();
let lastError = 0;

/** Saves everything that changed. Calls queue up, so two saves never overlap. */
export function flush(): Promise<void> {
  chain = chain.then(async () => {
    for (const c of COLLECTIONS) {
      try {
        await writeTable(c);
      } catch (e) {
        // Log at most once every 30 s so a database outage does not flood the console; the next run retries.
        if (Date.now() - lastError > 30_000) { lastError = Date.now(); console.error(`Database: could not save ${c.table}: ${(e as Error).message}`); }
      }
    }
  });
  return chain;
}

let debounce: NodeJS.Timeout | undefined;
/** Save soon (used after API calls that change data). */
export function flushSoon(ms = 150) {
  if (debounce) return;
  debounce = setTimeout(() => { debounce = undefined; void flush(); }, ms);
}

let timer: NodeJS.Timeout | undefined;
export function startAutosave() {
  if (timer) return;
  timer = setInterval(() => void flush(), env.persistIntervalMs);
  timer.unref();
}
export function stopAutosave() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

export const savedCounts = () => Object.fromEntries([...saved].map(([t, m]) => [t, m.size]));
