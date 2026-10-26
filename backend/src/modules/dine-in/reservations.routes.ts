import { Router } from "express";
import { HttpError, str } from "../../lib/http.js";
import { approvedMerchant, auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Reservation } from "../../store/types.js";
import {
  amountDue, cancelReservation, createReservation, decidePreorder, merchantCancel, modifyReservation, payReservation, reassignTable, respondReservation,
} from "./reservations.service.js";

function view(r: Reservation) {
  const m = db.merchants.get(r.merchantId);
  return { ...r, amountDue: amountDue(r), merchantPhone: m?.phone, venueCategory: m?.venueCategory, cutoffMs: Number(process.env.RESERVATION_CUTOFF_MS ?? 2 * 3600000) };
}

export const reservationsRouter = Router();
reservationsRouter.use(auth("customer"));

reservationsRouter.post("/", (req, res) => {
  const b = req.body ?? {};
  const r = createReservation({
    customerId: currentUser(res).id, merchantId: String(b.merchantId ?? ""), date: String(b.date ?? ""), time: String(b.time ?? ""),
    partySize: Number(b.partySize), specialRequest: b.specialRequest ? str(b.specialRequest, "Request", { max: 200 }) : undefined,
    preorder: Array.isArray(b.preorder) ? b.preorder : [], payNow: b.payNow === true,
  });
  res.status(201).json({ serverNow: Date.now(), reservation: view(r) });
});

function mine(res: import("express").Response, id: string): Reservation {
  const r = db.reservations.get(id);
  if (!r || r.customerId !== currentUser(res).id) throw new HttpError(404, "Reservation not found");
  return r;
}

reservationsRouter.get("/", (_req, res) => {
  const u = currentUser(res);
  const list = [...db.reservations.values()].filter((r) => r.customerId === u.id).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ serverNow: Date.now(), reservations: list.map(view) });
});
// Confirm-then-pay: the customer pays only after the restaurant has confirmed the table.
reservationsRouter.post("/:id/pay", (req, res) => {
  const r = mine(res, req.params.id as string);
  payReservation(r, req.body?.card?.number);
  res.json({ reservation: view(r) });
});
reservationsRouter.post("/:id/cancel", (req, res) => {
  const r = mine(res, req.params.id as string);
  cancelReservation(r);
  res.json({ reservation: view(r) });
});
reservationsRouter.patch("/:id", (req, res) => {
  const r = mine(res, req.params.id as string);
  const b = req.body ?? {};
  modifyReservation(r, { date: b.date, time: b.time, partySize: b.partySize === undefined ? undefined : Number(b.partySize), specialRequest: b.specialRequest });
  res.json({ reservation: view(r) });
});

export const merchantReservationsRouter = Router();
merchantReservationsRouter.use(auth("merchant"));

merchantReservationsRouter.get("/", (_req, res) => {
  const m = approvedMerchant(res);
  const list = [...db.reservations.values()].filter((r) => r.merchantId === m.id).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ serverNow: Date.now(), reservations: list.map(view) });
});

function own(res: import("express").Response, id: string): Reservation {
  const m = approvedMerchant(res);
  const r = db.reservations.get(id);
  if (!r || r.merchantId !== m.id) throw new HttpError(404, "Reservation not found");
  return r;
}

merchantReservationsRouter.post("/:id/respond", (req, res) => {
  const r = own(res, req.params.id as string);
  if (typeof req.body?.accept !== "boolean") throw new HttpError(400, "accept must be true or false");
  respondReservation(r, req.body.accept, req.body.table ? str(req.body.table, "Table", { max: 30 }) : undefined);
  res.json({ reservation: view(r) });
});
merchantReservationsRouter.post("/:id/preorder/:itemId", (req, res) => {
  const r = own(res, req.params.id as string);
  if (typeof req.body?.approve !== "boolean") throw new HttpError(400, "approve must be true or false");
  decidePreorder(r, req.params.itemId as string, req.body.approve);
  res.json({ reservation: view(r) });
});

merchantReservationsRouter.post("/:id/table", (req, res) => {
  const r = own(res, req.params.id as string);
  reassignTable(r, str(req.body?.table, "Table", { max: 30 }));
  res.json({ reservation: view(r) });
});
merchantReservationsRouter.post("/:id/cancel", (req, res) => {
  const r = own(res, req.params.id as string);
  merchantCancel(r);
  res.json({ reservation: view(r) });
});
