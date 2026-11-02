import { db } from "../store/db.js";
import type { Review } from "../store/types.js";

/** What customers see of a review: never the moderation notes, flag reason or the author's user id. */
export function publicReview(r: Review) {
  const dish = db.dishes.get(r.dishId);
  const shop = dish && db.merchants.get(dish.merchantId);
  return {
    id: r.id, dishId: r.dishId, dishName: dish?.name, merchantId: dish?.merchantId, merchantName: shop?.name,
    userName: r.userName, rating: r.rating, comment: r.comment, createdAt: r.createdAt, editedAt: r.editedAt, reply: r.reply,
  };
}

export const breakdownOf = (reviews: Review[]) => [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }));
