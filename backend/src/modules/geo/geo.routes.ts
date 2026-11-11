import { Router } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http.js";
import { auth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";

/**
 * Address helpers for the delivery address picker:
 *   GET /api/geo/reverse?lat=&lng=   the street address for a pin on the map ("auto-suggested address")
 *   GET /api/geo/search?q=&lat=&lng= places that match what the customer typed (near lat/lng when given)
 *   GET /api/geo/nearby?lat=&lng=    a few different addresses within about 150 m of the pin (the picker's "nearby" dropdown)
 * Both call OpenStreetMap Nominatim from the server, so the app never needs a map key and the free service sees one
 * polite client: requests are spaced out, answers are cached, and a failure never blocks ordering
 * (reverse falls back to the coordinates; search says to try again).
 */
export const geoRouter = Router();
geoRouter.use(auth("customer"), rateLimit(60, "geo"));

type NominatimPlace = { place_id?: number; osm_type?: string; osm_id?: number; lat?: string; lon?: string; name?: string; display_name?: string; address?: Record<string, string> };

// ---- polite client: one request at a time, at least geoMinGapMs apart ----
let queue: Promise<unknown> = Promise.resolve();
let lastAt = 0;
function politeFetch(url: string): Promise<any> {
  const run = async () => {
    const wait = lastAt + env.geoMinGapMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    const r = await fetch(url, { headers: { "User-Agent": env.geoUserAgent, "Accept-Language": "en" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(`geocoder answered ${r.status}`);
    return r.json();
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}

// ---- small cache (addresses do not change within a session) ----
const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 6 * 60 * 60 * 1000;
function cached<T>(key: string): T | undefined {
  const c = cache.get(key);
  if (!c || Date.now() - c.at > TTL_MS) { cache.delete(key); return undefined; }
  return c.value as T;
}
function remember(key: string, value: unknown) {
  if (cache.size >= 500) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
}

/** "Jalan Upland, Batu Lintang, Kuching": the parts a rider needs, without the country, postcode and district noise. */
export function shortAddress(p: NominatimPlace): string {
  const a = p.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const first = p.name && p.name !== a.road ? p.name : street;
  const area = a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.village;
  const city = a.city || a.town || a.municipality || a.county || a.state;
  const parts = [first, street && first !== street ? street : "", area, city].filter((x): x is string => !!x);
  const unique = parts.filter((x, i) => parts.indexOf(x) === i);
  if (unique.length) return unique.slice(0, 4).join(", ");
  return (p.display_name ?? "").split(",").slice(0, 3).map((x) => x.trim()).join(", ");
}

const num = (v: unknown) => (v === undefined || v === "" ? NaN : Number(v));
const coordOk = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

geoRouter.get("/reverse", async (req, res) => {
  const lat = num(req.query.lat);
  const lng = num(req.query.lng);
  if (!coordOk(lat, lng)) throw new HttpError(400, "Give lat and lng");
  const key = `r:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const hit = cached<object>(key);
  if (hit) return res.json(hit);
  let out: { line: string; name?: string; lat: number; lng: number; approximate: boolean };
  try {
    const p: NominatimPlace = await politeFetch(`${env.geoBaseUrl}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`);
    const line = shortAddress(p);
    if (!line) throw new Error("no address here");
    out = { line, name: p.name || undefined, lat, lng, approximate: false };
    remember(key, out);
  } catch {
    // Never block ordering: the pin is still a valid delivery spot, the customer can type the address.
    out = { line: `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`, lat, lng, approximate: true };
  }
  res.json(out);
});

geoRouter.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2 || q.length > 100) throw new HttpError(400, "Type at least 2 letters to search");
  const lat = num(req.query.lat);
  const lng = num(req.query.lng);
  const near = coordOk(lat, lng);
  // Without a position, lean towards Kuching (where the campus is). Results outside Malaysia are not useful for delivery.
  const [west, north, east, south] = near ? [lng - 0.25, lat + 0.25, lng + 0.25, lat - 0.25] : [110.1, 1.75, 110.6, 1.3];
  const key = `s:${q.toLowerCase()}|${west.toFixed(2)},${north.toFixed(2)}`;
  const hit = cached<object>(key);
  if (hit) return res.json(hit);
  try {
    const list: NominatimPlace[] = await politeFetch(`${env.geoBaseUrl}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=my&viewbox=${west},${north},${east},${south}&q=${encodeURIComponent(q)}`);
    const results = (Array.isArray(list) ? list : [])
      .map((p) => ({ id: `${p.osm_type ?? "x"}${p.osm_id ?? p.place_id}`, title: p.name || shortAddress(p).split(",")[0] || q, line: shortAddress(p), lat: Number(p.lat), lng: Number(p.lon) }))
      .filter((r) => coordOk(r.lat, r.lng));
    const out = { results };
    remember(key, out);
    res.json(out);
  } catch {
    throw new HttpError(502, "Place search is not available right now. Move the pin on the map instead.");
  }
});

/**
 * Addresses around a pin. OpenStreetMap has no "list what is nearby" call without a search word, so the pin and four
 * points about 130 m north, south, east and west of it are each looked up, then duplicates are dropped and the rest are
 * sorted by distance. Slower than a single lookup (the service is asked one request at a time), so the picker only asks
 * when the customer opens the dropdown.
 */
geoRouter.get("/nearby", async (req, res) => {
  const lat = num(req.query.lat);
  const lng = num(req.query.lng);
  if (!coordOk(lat, lng)) throw new HttpError(400, "Give lat and lng");
  const key = `n:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cached<object>(key);
  if (hit) return res.json(hit);
  const dLat = 130 / 111000;
  const dLng = 130 / (111000 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const points: [number, number][] = [[lat, lng], [lat + dLat, lng], [lat - dLat, lng], [lat, lng + dLng], [lat, lng - dLng]];
  const metresFromPin = (a: number, b: number) => Math.round(Math.hypot((a - lat) * 111000, (b - lng) * 111000 * Math.cos((lat * Math.PI) / 180)));
  const found = await Promise.all(points.map(async ([la, ln]) => {
    try {
      const p: NominatimPlace = await politeFetch(`${env.geoBaseUrl}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${la}&lon=${ln}`);
      const line = shortAddress(p);
      if (!line) return null;
      const pl = num(p.lat), pn = num(p.lon);
      const at = coordOk(pl, pn) ? { lat: pl, lng: pn } : { lat: la, lng: ln };
      return { line, title: p.name || line.split(",")[0], ...at };
    } catch { return null; }
  }));
  const seen = new Set<string>();
  const results = found
    .filter((r): r is NonNullable<typeof r> => !!r)
    .filter((r) => (seen.has(r.line) ? false : (seen.add(r.line), true)))
    .map((r, i) => ({ id: `n${i}`, ...r, distance: metresFromPin(r.lat, r.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map((r, i) => ({ ...r, id: `n${i}` }));
  if (!results.length) throw new HttpError(502, "Nearby addresses are not available right now. You can still type the address.");
  const out = { results };
  remember(key, out);
  res.json(out);
});
