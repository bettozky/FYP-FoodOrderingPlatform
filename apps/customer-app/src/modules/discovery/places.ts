import type { Merchant } from "../../shared/api/types";

/** A place to order to. Saved addresses (from the server) also have an id; shop places do not. */
export type Address = { id?: string; label: string; line: string; lat: number; lng: number; note?: string; isDefault?: boolean };

/**
 * Groups shops by the place before the comma in their stall number ("Canteen A, Stall 3" -> "Canteen A")
 * and puts the pin in the middle of those shops. Replaces the old made-up address list with real shop data.
 */
export function addressesFromShops(merchants: Merchant[]): Address[] {
  const groups = new Map<string, Merchant[]>();
  for (const m of merchants) {
    const place = (m.stallNo || "").split(",")[0].trim();
    if (!place || place === "TBC" || !Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
    groups.set(place, [...(groups.get(place) ?? []), m]);
  }
  return [...groups.entries()]
    .map(([place, shops]) => ({
      label: place,
      line: `${place} · ${shops.length} ${shops.length === 1 ? "shop" : "shops"}`,
      lat: Number((shops.reduce((s, m) => s + m.lat, 0) / shops.length).toFixed(6)),
      lng: Number((shops.reduce((s, m) => s + m.lng, 0) / shops.length).toFixed(6)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
