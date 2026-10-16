import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { RIDERS, db } from "../../store/db.js";
import { trackingFor } from "./delivery.service.js";

// Same contract as the standalone logistics demo (GET /riders, GET /orders/:id/tracking).
export const deliveryRouter = Router();
deliveryRouter.use(auth());

deliveryRouter.get("/riders", (_req, res) => res.json(RIDERS));

deliveryRouter.get("/orders/:id/tracking", (req, res) => {
  const o = db.orders.get(req.params.id as string);
  const u = currentUser(res);
  if (!o || (u.role === "customer" && o.customerId !== u.id)) throw new HttpError(404, "Order not found");
  const t = trackingFor(o.id);
  if (!t) return res.json({ status: "waiting", rider: null });
  res.json(t);
});
