import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { auth, currentUser } from "../../middleware/auth.js";

// Sprint 3 "spending tracker and weekly budget": the customer's optional weekly limit (RM). The app works out
// the spending itself from the customer's orders and warns at checkout before an order goes over the limit.
export const MAX_WEEKLY_BUDGET = 5000;

export const budgetRouter = Router();
budgetRouter.use(auth("customer"));

budgetRouter.get("/", (_req, res) => {
  res.json({ weeklyBudget: currentUser(res).weeklyBudget ?? null });
});

// { weeklyBudget: 50 } sets it; { weeklyBudget: null } removes it.
budgetRouter.put("/", (req, res) => {
  const raw = req.body?.weeklyBudget;
  const u = currentUser(res);
  if (raw === null) {
    u.weeklyBudget = undefined;
    return res.json({ weeklyBudget: null });
  }
  const n = Number(raw);
  if (typeof raw === "boolean" || !Number.isFinite(n) || n < 1 || n > MAX_WEEKLY_BUDGET)
    throw new HttpError(400, `Weekly budget must be between RM 1 and RM ${MAX_WEEKLY_BUDGET}`);
  u.weeklyBudget = Math.round(n * 100) / 100;
  res.json({ weeklyBudget: u.weeklyBudget });
});
