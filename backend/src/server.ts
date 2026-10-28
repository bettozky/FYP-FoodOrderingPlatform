import { app } from "./app.js";
import { env } from "./config/env.js";
import { startSweeper } from "./jobs/deadlines.js";
import { initDb } from "./store/db.js";
import { usingPostgres } from "./store/postgres/pool.js";

try {
  await initDb();
} catch (e) {
  // A refused connection has an empty message but a code such as ECONNREFUSED.
  const err = e as Error & { code?: string };
  console.error(`Could not connect to the database: ${err.message || err.code || String(e)}`);
  console.error("Check DATABASE_URL in backend/.env and that PostgreSQL is running.");
  process.exit(1);
}

startSweeper();
app.listen(env.port, "0.0.0.0", () => {
  console.log(`ScootMeal backend running on port ${env.port}`);
  console.log(usingPostgres ? "Data: PostgreSQL (merchant data is saved)" : "Data: in-memory demo (set DATABASE_URL to use PostgreSQL)");
  console.log("Demo logins: customer demo@scootmeal.test/demo123 | merchant ahseng@scootmeal.test/merchant123 | admin admin@scootmeal.test/admin123");
});
