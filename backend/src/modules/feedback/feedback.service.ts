// Week task 3: "Rate the app" after an order. The customer is asked at most once every 14 days,
// never again once they have rated (or tapped "Don't ask again"), and only after a completed order.
import type { User } from "../../store/types.js";

export const ASK_AGAIN_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export function shouldAskAppRating(u: Pick<User, "appRating" | "appRatingAskedAt" | "appRatingNever">, completedOrders: number, now = Date.now()): boolean {
  if (u.appRating || u.appRatingNever) return false;
  if (completedOrders < 1) return false;
  return !u.appRatingAskedAt || now - u.appRatingAskedAt >= ASK_AGAIN_AFTER_MS;
}

/** Average, count and 1-5 star split of all app ratings, plus the newest comments (for the admin). */
export function appRatingSummary(users: Iterable<Pick<User, "name" | "appRating">>) {
  const all = [...users].filter((u) => u.appRating).map((u) => ({ name: u.name, ...u.appRating! }));
  const breakdown = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: all.filter((r) => r.rating === stars).length }));
  const average = all.length ? Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10 : null;
  const latest = all.filter((r) => r.comment).sort((a, b) => b.at - a.at).slice(0, 20);
  return { average, count: all.length, breakdown, latest };
}
