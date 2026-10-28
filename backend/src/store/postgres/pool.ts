// PostgreSQL connection pool. Only created when DATABASE_URL is set.
import pg from "pg";
import { env } from "../../config/env.js";

// DATE as "YYYY-MM-DD" text (not a Date shifted by the time zone), NUMERIC as a JS number.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));

export const usingPostgres = Boolean(env.databaseUrl);

// Hosted databases (Supabase etc.) only accept SSL. Their certificate is signed by the provider's own CA,
// which Node does not trust by default, so the connection is encrypted without checking the certificate.
const isLocal = (url: string) => /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const ssl = env.databaseUrl && !isLocal(env.databaseUrl) && !/sslmode=/.test(env.databaseUrl) ? { rejectUnauthorized: false } : undefined;

export const pool = usingPostgres ? new pg.Pool({ connectionString: env.databaseUrl, ssl }) : null;

export type Queryable = Pick<pg.PoolClient, "query">;

function requirePool(): pg.Pool {
  if (!pool) throw new Error("DATABASE_URL is not set");
  return pool;
}

export const query = <R extends pg.QueryResultRow = any>(text: string, params?: unknown[]) =>
  requirePool().query<R>(text, params);

/** Runs fn inside BEGIN / COMMIT, rolling back if it throws. */
export async function withTransaction<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** True for "duplicate key" errors (e.g. an email or voucher code that already exists). */
export const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === "23505";
