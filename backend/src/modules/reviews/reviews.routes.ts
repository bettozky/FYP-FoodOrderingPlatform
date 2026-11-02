import { Router } from "express";
import { HttpError, int, str } from "../../lib/http.js";
import { breakdownOf, publicReview } from "../../lib/reviewView.js";
import { averageOf, merchantIdOfReview } from "../../lib/ratings.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Review } from "../../store/types.js";
import { screenReview } from "../admin/moderation.js";
import { notify } from "../notifications/notifications.service.js";

/** A customer's own reviews. New reviews are written with POST /api/orders/:id/reviews. */
export const reviewsRouter = Router();
reviewsRouter.use(auth("customer"));

function mine(userId: string, id: string) {
  const r = db.reviews.find((x) => x.id === id && x.userId === userId);
  if (!r) throw new HttpError(404, "Review not found");
  return r;
}

// Everything I have received but not reviewed yet (one row per dish per order), newest first.
reviewsRouter.get("/pending", (_req, res) => {
  const u = currentUser(res);
  const pending = [...db.orders.values()]
    .filter((o) => o.customerId === u.id)
    .flatMap((o) =>
      o.items
        .filter((i) => ["collected", "delivered"].includes(i.status) && !o.reviewedDishIds.includes(i.dishId))
        .map((i) => ({ orderId: o.id, dishId: i.dishId, dishName: i.name, image: db.dishes.get(i.dishId)?.image, merchantId: o.merchantId, merchantName: o.merchantName, orderedAt: o.createdAt })),
    )
    // one row per dish per order even if the dish was ordered in two modes
    .filter((p, idx, all) => all.findIndex((x) => x.orderId === p.orderId && x.dishId === p.dishId) === idx)
    .sort((a, b) => b.orderedAt - a.orderedAt);
  res.json({ pending });
});

reviewsRouter.get("/mine", (_req, res) => {
  const u = currentUser(res);
  const reviews = db.reviews.filter((r) => r.userId === u.id).sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => ({ ...publicReview(r), orderId: r.orderId, hidden: Boolean(r.hidden) }));
  res.json({ reviews });
});

reviewsRouter.patch("/:id", (req, res) => {
  const r = mine(currentUser(res).id, req.params.id as string);
  if (req.body?.rating === undefined && req.body?.comment === undefined) throw new HttpError(400, "Nothing to change");
  if (req.body?.rating !== undefined) r.rating = int(req.body.rating, "Rating", 1, 5);
  if (req.body?.comment !== undefined) {
    r.comment = str(req.body.comment, "Comment", { optional: true, max: 300 }) || undefined;
    const reason = screenReview(r.comment);
    r.flagged = Boolean(reason);
    r.flagReason = reason;
  }
  r.editedAt = Date.now();
  res.json({ review: { ...publicReview(r), orderId: r.orderId, hidden: Boolean(r.hidden) } });
});

reviewsRouter.delete("/:id", (req, res) => {
  const r = mine(currentUser(res).id, req.params.id as string);
  db.reviews.splice(db.reviews.indexOf(r), 1);
  // Let the customer review the dish again.
  const o = db.orders.get(r.orderId);
  if (o) o.reviewedDishIds = o.reviewedDishIds.filter((id) => id !== r.dishId);
  res.json({ ok: true });
});

/** The shop's side: read the reviews on its dishes and answer them in public. */
export const merchantReviewsRouter = Router();
merchantReviewsRouter.use(auth("merchant"));

const merchantId = (res: any): string => {
  const id = currentUser(res).merchantId;
  if (!id) throw new HttpError(403, "No shop on this account");
  return id;
};
const ofShop = (id: string): Review[] => db.reviews.filter((r) => merchantIdOfReview(r) === id && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);

// ?unanswered=true shows only the ones without a reply
merchantReviewsRouter.get("/", (req, res) => {
  const all = ofShop(merchantId(res));
  const list = req.query.unanswered === "true" ? all.filter((r) => !r.reply) : all;
  res.json({ average: averageOf(all.map((r) => r.rating)), count: all.length, unanswered: all.filter((r) => !r.reply).length, breakdown: breakdownOf(all), reviews: list.map(publicReview) });
});

merchantReviewsRouter.put("/:id/reply", (req, res) => {
  const r = ofShop(merchantId(res)).find((x) => x.id === req.params.id);
  if (!r) throw new HttpError(404, "Review not found");
  const text = str(req.body?.text, "Reply", { max: 300 });
  const first = !r.reply;
  r.reply = { text, at: Date.now() };
  if (first) {
    const dish = db.dishes.get(r.dishId);
    notify(r.userId, "review_reply", "The shop replied to your review", `${db.merchants.get(dish?.merchantId ?? "")?.name ?? "The shop"}: ${text.slice(0, 120)}`, { reviewId: r.id });
  }
  res.json({ review: publicReview(r) });
});

merchantReviewsRouter.delete("/:id/reply", (req, res) => {
  const r = ofShop(merchantId(res)).find((x) => x.id === req.params.id);
  if (!r) throw new HttpError(404, "Review not found");
  delete r.reply;
  res.json({ ok: true });
});
