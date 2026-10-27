import type { Dish } from "../../shared/api/types";

/** "All" plus every category real dishes use, most common first (replaces the fixed placeholder list). */
export function categoriesFromDishes(dishes: Pick<Dish, "category">[]): string[] {
  const count = new Map<string, number>();
  for (const d of dishes) { const c = (d.category || "").trim(); if (c) count.set(c, (count.get(c) ?? 0) + 1); }
  return ["All", ...[...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c)];
}
