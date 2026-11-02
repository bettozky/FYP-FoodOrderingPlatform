import { app } from "./app.js";
import { env, usingSupabaseStorage } from "./config/env.js";
import { startSweeper } from "./jobs/deadlines.js";
import { fetchDishPhotos } from "./jobs/fetchDishPhotos.js";
import { initStore, shutdownStore, storageMode } from "./store/persistence/index.js";

try {
  await initStore();
} catch (e) {
  // A refused connection has an empty message but a code such as ECONNREFUSED.
  const err = e as Error & { code?: string };
  console.error(`Could not start the database: ${err.message || err.code || String(e)}`);
  console.error("Check DATABASE_URL in backend/.env (Supabase: Project Settings -> Database -> Connection string, use the Session pooler).");
  process.exit(1);
}

startSweeper();
fetchDishPhotos().catch((e) => console.warn("Dish photos skipped:", e.message));

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`ScootMeal backend running on port ${env.port}`);
  console.log(`Data:  ${storageMode() === "postgres" ? "PostgreSQL / Supabase (saved)" : "in memory (resets on restart). Set DATABASE_URL in backend/.env to keep data"}`);
  console.log(`Files: ${usingSupabaseStorage ? "Supabase Storage" : "local folder backend/public/uploads"}`);
  if (env.seedDemoData) console.log("Demo logins: customer demo@scootmeal.test/demo123 | merchant ahseng@scootmeal.test/merchant123 | admin admin@scootmeal.test/admin123");
});

// Ctrl+C / hosting restart: save what is still waiting, then stop.
let stopping = false;
async function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: saving and shutting down...`);
  server.close();
  try { await shutdownStore(); } catch (e) { console.error("Could not save on shutdown:", (e as Error).message); }
  process.exit(0);
}
process.on("SIGINT", () => void stop("SIGINT"));
process.on("SIGTERM", () => void stop("SIGTERM"));
