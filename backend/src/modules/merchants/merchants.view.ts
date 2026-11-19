import { kitchenAllergens } from "../../lib/allergens.js";
import { distanceKm } from "../../lib/geo.js";
import { liveRating } from "../../lib/ratings.js";
import { isOpenNow } from "../../lib/time.js";
import { CAMPUS, db } from "../../store/db.js";
import type { Merchant } from "../../store/types.js";
import { estimateWait } from "./waitTime.js";
import { busyState } from "./busyMode.js";

export function merchantView(m: Merchant, from = CAMPUS) {
  const open = m.approval === "approved" && m.storeMode !== "offline" && isOpenNow(m);
  const wait = estimateWait(m.prepMinutes, db.orders.values(), m.id, open);
  return {
    id: m.id, name: m.name, stallNo: m.stallNo, rating: liveRating(m), prepMinutes: m.prepMinutes, tags: m.tags,
    color: m.color, hours: m.hours,
    weeklyHours: m.weeklyHours?.length ? m.weeklyHours : null, // per-day hours (0 = Sunday, missing day = closed); null = `hours` every day
    venueCategory: m.venueCategory, phone: m.phone, lat: m.lat, lng: m.lng,
    storeMode: m.storeMode, logo: m.logo, cover: m.cover,
    allergens: kitchenAllergens(m, db.dishes.values()), // undefined = the shop never said
    openNow: open, // FR-1.6
    dineInOnly: m.storeMode === "dine_in",
    distanceKm: Math.round(distanceKm(from, m) * 100) / 100, // FR-1.5
    // Live wait (Live Canteen Map + "Ready in X min"): queue, waitMinutes and busy (quiet / busy / very_busy / closed).
    ...wait,
    // Sprint 3 busy mode: waitLimit, overLimit, ordersPaused ("pause") and longWaitWarning ("warn").
    ...busyState(m.busyMode, wait.waitMinutes, open),
  };
}

export function origin(q: Record<string, unknown>) {
  const lat = Number(q.lat), lng = Number(q.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && q.lat !== undefined ? { lat, lng } : CAMPUS;
}
