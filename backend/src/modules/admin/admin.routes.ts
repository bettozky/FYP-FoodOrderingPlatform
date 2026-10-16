import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { auth } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import { notifyMerchant } from "../notifications/notifications.service.js";

// FR-6.1 / FR-6.2: admin-only merchant approval.
export const adminRouter = Router();
adminRouter.use(auth("admin"));

adminRouter.get("/merchants", (req, res) => {
  const status = String(req.query.status ?? "");
  const list = [...db.merchants.values()]
    .filter((m) => !status || m.approval === status)
    .map((m) => {
      const owner = m.ownerUserId ? db.users.get(m.ownerUserId) : undefined;
      return { id: m.id, name: m.name, stallNo: m.stallNo, tags: m.tags, phone: m.phone, approval: m.approval, owner: owner?.name, email: owner?.email, hours: m.hours };
    });
  res.json({ merchants: list });
});

adminRouter.patch("/merchants/:id", (req, res) => {
  const m = db.merchants.get(req.params.id as string);
  if (!m) throw new HttpError(404, "Merchant not found");
  const approval = req.body?.approval;
  if (!["approved", "rejected", "suspended", "pending"].includes(approval)) throw new HttpError(400, "approval must be approved, rejected, suspended or pending");
  m.approval = approval;
  notifyMerchant(m.id, "approval", `Business ${approval}`, approval === "approved" ? "Your business is live on ScootMeal." : `Your business was ${approval} by the admin.`);
  res.json({ merchant: { id: m.id, approval: m.approval } });
});
