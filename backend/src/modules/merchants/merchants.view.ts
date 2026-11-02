import { distanceKm } from "../../lib/geo.js";
import { liveRating } from "../../lib/ratings.js";
import { isOpenNow } from "../../lib/time.js";
import { CAMPUS } from "../../store/db.js";
import type { Merchant } from "../../store/types.js";

export function merchantView(m: Merchant, from = CAMPUS) {
  const open = m.approval === "approved" && m.storeMode !== "offline" && isOpenNow(m);
  return {
    id: m.id, name: m.name, stallNo: m.stallNo, rating: liveRating(m), prepMinutes: m.prepMinutes, tags: m.tags,
    color: m.color, hours: m.hours, venueCategory: m.venueCategory, phone: m.phone, lat: m.lat, lng: m.lng,
    storeMode: m.storeMode, logo: m.logo, cover: m.cover,
    openNow: open, // FR-1.6
    dineInOnly: m.storeMode === "dine_in",
    distanceKm: Math.round(distanceKm(from, m) * 100) / 100, // FR-1.5
  };
}

export function origin(q: Record<string, unknown>) {
  const lat = Number(q.lat), lng = Number(q.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && q.lat !== undefined ? { lat, lng } : CAMPUS;
}
