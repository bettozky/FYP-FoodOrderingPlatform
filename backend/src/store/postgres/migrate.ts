// Applies the SQL files in backend/database/migrations once each, in order.
// Already-applied files are recorded in the schema_migrations table.
//   npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

// Same depth from src/store/postgres and dist/store/postgres.
const MIGRATIONS_DIR = fileURLToPath(new URL("../../../database/migrations/", import.meta.url));

export async function migrate() {
  if (!pool) throw new Error("DATABASE_URL is not set");
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);

    // A database created earlier with schema.sql already has the base tables.
    const { rows: done } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(done.map((r) => r.name));
    if (applied.size === 0) {
      const { rows } = await client.query("SELECT to_regclass('public.users') AS t");
      if (rows[0].t) {
        await client.query("INSERT INTO schema_migrations (name) VALUES ('001_base_schema.sql')");
        applied.add("001_base_schema.sql");
      }
    }

    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Database: applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        (err as Error).message = `Migration ${file} failed: ${(err as Error).message}`;
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

// Allow running directly: npm run db:migrate
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate()
    .then(() => { console.log("Database is up to date"); process.exit(0); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
