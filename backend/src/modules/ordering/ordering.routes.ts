import { Router } from "express";
import { HttpError, str } from "../../lib/http.js";
import { approvedMerchant, auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Order } from "../../store/types.js";
import {
  cancelRequest, confirmCollected, customerDecision, handOver, markOutOfStock, markReady, merchantRespond, payOrder, placeOrder, reviewItem,
} from "./ordering.service.js";

function view(o: Order) {
  const m = db.merchants.get(o.merchantId);
  return { ...o, merchantPhone: m?.phone, canReview: o.items.some((i) => ["collected", "delivered"].includes(i.status) && !o.reviewedDishIds.includes(i.dishId)) };
}

/** Customer side. */
export const ordersRouter = Router();
ordersRouter.use(auth("customer"));

ordersRouter.post("/", (req, res) => {
  const u = currentUser(res);
  const b = req.body ?? {};
  const order = placeOrder({
    customerId: u.id, merchantId: String(b.merchantId ?? ""), items: b.items, address: b.address,
    voucherId: b.voucherId || undefined,
  });
  res.status(201).json({ serverNow: Date.now(), order: view(order) });
});

function mine(res: import("express").Response, id: string): Order {
  const o = db.orders.get(id);
  if (!o || o.customerId !== currentUser(res).id) throw new HttpError(404, "Order not found");
  return o;
}

ordersRouter.get("/", (_req, res) => {
  const u = currentUser(res);
  const list = [...db.orders.values()].filter((o) => o.customerId === u.id).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ serverNow: Date.now(), orders: list.map(view) });
});

ordersRouter.get("/:id", (req, res) => res.json({ serverNow: Date.now(), order: view(mine(res, req.params.id as string)) }));

// The customer pays only after the restaurant has confirmed the request.
ordersRouter.post("/:id/pay", (req, res) => {
  const o = mine(res, req.params.id as string);
  payOrder(o, req.body?.card?.number);
  res.json({ serverNow: Date.now(), order: view(o) });
});

// The customer withdraws a request before paying.
ordersRouter.post("/:id/cancel", (req, res) => {
  const o = mine(res, req.params.id as string);
  cancelRequest(o);
  res.json({ serverNow: Date.now(), order: view(o) });
});

// FR-2.5: accept a partial order or cancel for a full refund.
ordersRouter.post("/:id/decision", (req, res) => {
  const o = mine(res, req.params.id as string);
  const choice = req.body?.choice;
  if (choice !== "continue" && choice !== "cancel") throw new HttpError(400, "choice must be continue or cancel");
  customerDecision(o, choice);
  res.json({ order: view(o) });
});

// FR-2.7: customer confirms collection, which dismisses the food-ready pop-up.
ordersRouter.post("/:id/collected", (req, res) => {
  const o = mine(res, req.params.id as string);
  const mode = req.body?.mode;
  if (mode !== "dine_in" && mode !== "takeaway") throw new HttpError(400, "mode must be dine_in or takeaway");
  confirmCollected(o, mode);
  res.json({ order: view(o) });
});

// FR-2.8: rate individual items.
ordersRouter.post("/:id/reviews", (req, res) => {
  const o = mine(res, req.params.id as string);
  reviewItem(o, String(req.body?.dishId ?? ""), Number(req.body?.rating), req.body?.comment ? str(req.body.comment, "Comment", { max: 300 }) : undefined, currentUser(res).name);
  res.status(201).json({ order: view(o) });
});

/** Merchant side. */
export const merchantOrdersRouter = Router();
merchantOrdersRouter.use(auth("merchant"));

merchantOrdersRouter.get("/", (_req, res) => {
  const m = approvedMerchant(res);
  const list = [...db.orders.values()].filter((o) => o.merchantId === m.id).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ serverNow: Date.now(), orders: list.map(view) });
});

function own(res: import("express").Response, id: string): Order {
  const m = approvedMerchant(res);
  const o = db.orders.get(id);
  if (!o || o.merchantId !== m.id) throw new HttpError(404, "Order not found");
  return o;
}

merchantOrdersRouter.post("/:id/respond", (req, res) => {
  const o = own(res, req.params.id as string);
  if (typeof req.body?.accept !== "boolean") throw new HttpError(400, "accept must be true or false");
  merchantRespond(o, req.body.accept);
  res.json({ serverNow: Date.now(), order: view(o) });
});

merchantOrdersRouter.post("/:id/items/:itemId/out-of-stock", (req, res) => {
  const o = own(res, req.params.id as string);
  markOutOfStock(o, req.params.itemId as string);
  res.json({ order: view(o) });
});

merchantOrdersRouter.post("/:id/ready", (req, res) => {
  const o = own(res, req.params.id as string);
  const mode = req.body?.mode;
  if (mode !== "dine_in" && mode !== "takeaway") throw new HttpError(400, "mode must be dine_in or takeaway");
  markReady(o, mode);
  res.json({ order: view(o) });
});

merchantOrdersRouter.post("/:id/handover", (req, res) => {
  const o = own(res, req.params.id as string);
  handOver(o);
  res.json({ order: view(o) });
});
