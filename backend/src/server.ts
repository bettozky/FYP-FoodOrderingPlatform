import { app } from "./app.js";
import { env } from "./config/env.js";
import { startSweeper } from "./jobs/deadlines.js";

startSweeper();
app.listen(env.port, "0.0.0.0", () => {
  console.log(`ScootMeal backend running on port ${env.port}`);
  console.log("Demo logins: customer demo@scootmeal.test/demo123 | merchant ahseng@scootmeal.test/merchant123 | admin admin@scootmeal.test/admin123");
});
