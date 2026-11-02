import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Address } from "../../store/types.js";

/** Saved delivery addresses of the signed-in customer. Same shape as the app's Address ({ label, line, lat, lng }) plus id, note and isDefault. */
export const addressesRouter = Router();
addressesRouter.use(auth("customer"));

const MAX_ADDRESSES = 10;

const view = (a: Address) => ({ id: a.id, label: a.label, line: a.line, lat: a.lat, lng: a.lng, note: a.note, isDefault: a.isDefault });
const mine = (userId: string) => [...db.addresses.values()].filter((a) => a.userId === userId).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt);

function fields(b: Record<string, any>, old?: Address) {
  const label = String(b.label ?? old?.label ?? "").trim();
  const line = String(b.line ?? old?.line ?? "").trim();
  const lat = Number(b.lat ?? old?.lat);
  const lng = Number(b.lng ?? old?.lng);
  const note = b.note === undefined ? old?.note : String(b.note).trim() || undefined;
  if (!label || label.length > 40) throw new HttpError(400, "Give the address a short name (max 40 characters), e.g. Hostel");
  if (!line || line.length > 200) throw new HttpError(400, "Enter the address (max 200 characters)");
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) throw new HttpError(400, "Pick the location on the map (lat / lng are missing)");
  if (note && note.length > 200) throw new HttpError(400, "Keep the note under 200 characters");
  return { label, line, lat, lng, note };
}

function findMine(userId: string, id: string): Address {
  const a = db.addresses.get(id);
  if (!a || a.userId !== userId) throw new HttpError(404, "Address not found");
  return a;
}

addressesRouter.get("/", (_req, res) => res.json({ addresses: mine(currentUser(res).id).map(view) }));

// The first address becomes the default.
addressesRouter.post("/", (req, res) => {
  const u = currentUser(res);
  const existing = mine(u.id);
  if (existing.length >= MAX_ADDRESSES) throw new HttpError(400, `You can save up to ${MAX_ADDRESSES} addresses`);
  const makeDefault = existing.length === 0 || req.body?.isDefault === true;
  if (makeDefault) existing.forEach((a) => (a.isDefault = false));
  const a: Address = { id: uid("addr"), userId: u.id, ...fields(req.body ?? {}), isDefault: makeDefault, createdAt: Date.now() };
  db.addresses.set(a.id, a);
  res.status(201).json({ address: view(a) });
});

addressesRouter.patch("/:id", (req, res) => {
  const u = currentUser(res);
  const a = findMine(u.id, req.params.id as string);
  Object.assign(a, fields(req.body ?? {}, a));
  if (req.body?.isDefault === true) {
    mine(u.id).forEach((x) => (x.isDefault = false));
    a.isDefault = true;
  }
  res.json({ address: view(a) });
});

// If the default is deleted, the oldest remaining address becomes the default.
addressesRouter.delete("/:id", (req, res) => {
  const u = currentUser(res);
  const a = findMine(u.id, req.params.id as string);
  db.addresses.delete(a.id);
  if (a.isDefault) {
    const next = mine(u.id).sort((x, y) => x.createdAt - y.createdAt)[0];
    if (next) next.isDefault = true;
  }
  res.json({ ok: true });
});
