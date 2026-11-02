// Store start-up: choose memory or database, load / seed the data, keep it saved.
import { env } from "../../config/env.js";
import { hashPassword, syncSequences } from "../../lib/ids.js";
import { clearDb, db } from "../db.js";
import { seedDemoData } from "../seed.js";
import { migrate } from "./migrate.js";
import { closePool, getPool, usingDatabase } from "./pool.js";
import { flush, flushSoon, load, startAutosave, stopAutosave } from "./sync.js";

export { usingDatabase, flushSoon };
export const storageMode = () => (usingDatabase ? "postgres" : "memory");

function ensureBootstrapAdmin() {
  const { bootstrapAdminEmail: email, bootstrapAdminPassword: password } = env;
  if (!email || !password) return;
  if ([...db.users.values()].some((u) => u.role === "admin")) return;
  if ([...db.users.values()].some((u) => u.email === email)) return;
  db.users.set("u_admin", { id: "u_admin", role: "admin", email, name: "Platform Admin", passwordHash: hashPassword(password) });
  console.log(`Created the admin account ${email} (from ADMIN_EMAIL / ADMIN_PASSWORD).`);
}

/** Call once before the server starts listening. */
export async function initStore(): Promise<void> {
  if (!usingDatabase) {
    clearDb();
    seedDemoData();
    ensureBootstrapAdmin();
    return;
  }
  await getPool().query("SELECT 1"); // fail fast with a clear message if the database cannot be reached
  await migrate();
  const rows = await load();
  const empty = db.users.size === 0 && db.merchants.size === 0;
  if (empty && env.seedDemoData) {
    console.log("Database is empty: adding the demo shops, dishes and logins (set SEED_DEMO_DATA=false to skip this).");
    seedDemoData();
  }
  ensureBootstrapAdmin();
  syncSequences(db.orders.keys(), db.reservations.keys());
  await flush();
  startAutosave();
  console.log(`Database connected: ${rows} saved records loaded.`);
}

/** Demo helper (POST /api/dev/reset): throw everything away and put the demo data back. */
export async function resetStore(): Promise<void> {
  clearDb();
  seedDemoData();
  ensureBootstrapAdmin();
  if (usingDatabase) await flush();
}

/** Save and disconnect (called on Ctrl+C / shutdown). */
export async function shutdownStore(): Promise<void> {
  if (!usingDatabase) return;
  stopAutosave();
  await flush();
  await closePool();
}

