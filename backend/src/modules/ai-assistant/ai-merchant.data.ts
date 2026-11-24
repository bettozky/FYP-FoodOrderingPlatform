// What the merchant assistant is allowed to see: ONLY the signed-in merchant's own stall.
// No customer names, phone numbers, addresses or payment IDs.
import { money } from "../../lib/http.js";
import { db } from "../../store/db.js";
import type { Merchant, Order } from "../../store/types.js";
import { merchantView } from "../merchants/merchants.view.js";
import { chartsForContext } from "./ai-merchant.charts.js";

const ACTIVE = new Set<Order["status"]>(["awaiting_merchant", "awaiting_payment", "preparing"]);
const NOT_SOLD = new Set(["out_of_stock", "cancelled"]);
const MAX_ACTIVE = 30;
const MAX_REVIEWS = 15;
const minutesAgo = (ts: number) => Math.max(0, Math.round((Date.now() - ts) / 60000));

export function getMerchantContext(merchant: Merchant) {
  const view = merchantView(merchant); // open now, live queue, wait time, busy mode
  const mine = [...db.orders.values()].filter((o) => o.merchantId === merchant.id);

  // Today's sales: the same rules as the dashboard (GET /api/merchant/stats), so the numbers match.
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const counted = mine.filter(
    (o) => o.createdAt >= startOfToday && (o.status === "preparing" || o.status === "completed")
  );
  let revenue = 0;
  const sold = new Map<string, { name: string; qty: number }>();
  for (const o of counted) {
    for (const i of o.items) {
      if (NOT_SOLD.has(i.status)) continue;
      revenue += i.price * i.qty;
      const e = sold.get(i.dishId) ?? { name: i.name, qty: 0 };
      e.qty += i.qty;
      sold.set(i.dishId, e);
    }
  }

  // Orders still in progress, oldest first. Only the order ID, never who the customer is.
  const active = mine.filter((o) => ACTIVE.has(o.status)).sort((a, b) => a.createdAt - b.createdAt);
  const activeOrders = active.slice(0, MAX_ACTIVE).map((o) => ({
    id: o.id,
    status: o.status,
    minutesAgo: minutesAgo(o.createdAt),
    total: o.total,
    paid: o.paidAt !== undefined,
    paymentMethod: o.paymentMethod ?? null,
    items: o.items.map((i) => ({ name: i.name, qty: i.qty, mode: i.mode, status: i.status, options: i.options })),
  }));

  // The stall's own menu (its own ingredient costs are fine to show the owner).
  const dishes = [...db.dishes.values()].filter((d) => d.merchantId === merchant.id);
  const menu = dishes.map((d) => ({
    id: d.id,
    name: d.name,
    price: d.price,
    cost: d.cost ?? null,
    category: d.category,
    soldOut: d.soldOut || d.stock === 0,
    stock: d.stock ?? null,
    deal:
      d.deal && d.deal.endsAt > Date.now()
        ? { percent: d.deal.percent, minutesLeft: Math.round((d.deal.endsAt - Date.now()) / 60000) }
        : null,
  }));

  // Latest reviews of this stall's dishes (hidden ones removed, no reviewer names).
  const dishName = new Map(dishes.map((d) => [d.id, d.name]));
  const reviews = db.reviews.filter((r) => dishName.has(r.dishId) && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);
  const recentReviews = reviews.slice(0, MAX_REVIEWS).map((r) => ({
    dish: dishName.get(r.dishId),
    rating: r.rating,
    comment: r.comment?.slice(0, 500) ?? null,
    daysAgo: Math.floor(minutesAgo(r.createdAt) / 1440),
    replied: r.reply !== undefined,
  }));

  return {
    source: "ScootMeal server demo store",
    stall: {
      id: merchant.id,
      name: merchant.name,
      stallNo: merchant.stallNo,
      openNow: view.openNow,
      storeMode: merchant.storeMode,
      hours: view.hours,
      weeklyHours: view.weeklyHours,
      rating: view.rating,
      prepMinutes: merchant.prepMinutes,
      queue: view.queue,
      waitMinutes: view.waitMinutes,
      busy: view.busy,
      busyMode: merchant.busyMode ?? { on: false },
      ordersPaused: view.ordersPaused,
    },
    today: {
      orders: counted.length,
      revenue: money(revenue),
      bestSellers: [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
    },
    activeOrderCount: active.length,
    activeOrders,
    activeOrdersLimit: MAX_ACTIVE,
    menu,
    reviewCount: reviews.length,
    recentReviews,
    recentReviewsLimit: MAX_REVIEWS,
    // Sales over time and best sellers (the same numbers the chart card shows).
    charts: chartsForContext(merchant.id),
  };
}

export type MerchantContext = ReturnType<typeof getMerchantContext>;