/**
 * For state that is refreshed by polling: keep the old object when the new data is identical.
 * Otherwise every poll hands React a brand-new array, every screen using it redraws, and lists and photos flicker.
 *   setOrders((prev) => keepIfSame(prev, fresh));
 */
export function keepIfSame<T>(prev: T, next: T): T {
  try {
    return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
  } catch {
    return next;
  }
}
