// Week task 3: "Rate the app" pop-up after an order (customer), and the results for the admin.
//   GET  /api/feedback/app-rating          -> { shouldAsk, rated, rating? }
//   POST /api/feedback/app-rating          { rating 1-5, comment? }      save the rating (once per customer)
//   POST /api/feedback/app-rating/later    { never?: true }              "Not now" (ask again in 14 days) / "Don't ask again"
//   GET  /api/admin/app-ratings            (admin) average, count, 1-5 split, newest comments
import { Router } from "express";
import { HttpError, int, str } from "../../lib/http.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import { appRatingSummary, shouldAskAppRating } from "./feedback.service.js";

export const feedbackRouter = Router();
feedbackRouter.use(auth("customer"));

const completedOrders = (userId: string) => [...db.orders.values()].filter((o) => o.customerId === userId && o.status === "completed").length;

feedbackRouter.get("/app-rating", (_req, res) => {
  const u = currentUser(res);
  res.json({ shouldAsk: shouldAskAppRating(u, completedOrders(u.id)), rated: !!u.appRating, rating: u.appRating?.rating ?? null });
});

feedbackRouter.post("/app-rating", (req, res) => {
  const u = currentUser(res);
  if (u.appRating) throw new HttpError(409, "You have already rated the app. Thank you!");
  const rating = int(req.body?.rating, "Rating", 1, 5);
  const comment = req.body?.comment ? str(req.body.comment, "Comment", { max: 500 }) : undefined;
  u.appRating = { rating, comment, at: Date.now(), orderId: req.body?.orderId ? String(req.body.orderId) : undefined };
  u.appRatingAskedAt = Date.now();
  res.status(201).json({ rated: true, rating });
});

feedbackRouter.post("/app-rating/later", (req, res) => {
  const u = currentUser(res);
  u.appRatingAskedAt = Date.now();
  if (req.body?.never === true) u.appRatingNever = true;
  res.json({ shouldAsk: false });
});

export const adminFeedbackRouter = Router();
adminFeedbackRouter.use(auth("admin"));
adminFeedbackRouter.get("/", (_req, res) => {
  res.json(appRatingSummary(db.users.values()));
});
