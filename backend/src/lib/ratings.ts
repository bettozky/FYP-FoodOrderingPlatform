import { db } from "../store/db.js";
import type { Merchant, Review } from "../store/types.js";

/** Reviews that count: hidden (moderated) reviews are ignored everywhere customers see ratings. */
export const isVisible = (r: Review) => !r.hidden;

export function merchantIdOfReview(r: Review): string | undefined {
  return db.dishes.get(r.dishId)?.merchantId;
}

export function reviewsOfMerchant(merchantId: string, includeHidden = false): Review[] {
  return db.reviews.filter((r) => merchantIdOfReview(r) === merchantId && (includeHidden || isVisible(r)));
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/**
 * The rating customers see. A shop starts with its listed rating; once it has 3 or more visible
 * reviews, the average of those reviews is used instead, so bad service shows up and hidden reviews don't count.
 */
export function liveRating(m: Merchant): number {
  const rs = reviewsOfMerchant(m.id).map((r) => r.rating);
  return rs.length >= 3 ? avg(rs)! : m.rating;
}

export const averageOf = avg;
