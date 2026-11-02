// PostgreSQL connection (works with Supabase and any other PostgreSQL).
import pg from "pg";
import { env } from "../../config/env.js";

export const usingDatabase = Boolean(env.databaseUrl);

let pool: pg.Pool | undefined;

function sslFor(url: string): pg.PoolConfig["ssl"] {
  if (env.databaseSsl === "false") return false;
  if (env.databaseSsl === "true") return { rejectUnauthorized: false };
  // auto: Supabase and other hosted databases need SSL, a database on this PC does not.
  let host = "";
  try { host = new URL(url).hostname; } catch { /* leave empty */ }
  return ["localhost", "127.0.0.1", "::1", ""].includes(host) ? false : { rejectUnauthorized: false };
}

export function getPool(): pg.Pool {
  if (!env.databaseUrl) throw new Error("DATABASE_URL is not set");
  if (!pool) {
    pool = new pg.Pool({ connectionString: env.databaseUrl, ssl: sslFor(env.databaseUrl), max: 5, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 });
    pool.on("error", (e) => console.error("Database connection error:", e.message));
  }
  return pool;
}

export async function closePool() {
  await pool?.end();
  pool = undefined;
}
