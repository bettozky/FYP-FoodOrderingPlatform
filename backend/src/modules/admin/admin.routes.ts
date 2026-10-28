import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { signedUrl } from "../../lib/storage.js";
import { auth } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Merchant } from "../../store/types.js";
import { setMerchantApproval } from "../merchants/merchants.repository.js";
import { notifyMerchant } from "../notifications/notifications.service.js";

// FR-6.1 / FR-6.2: admin-only merchant approval.
export const adminRouter = Router();
adminRouter.use(auth("admin"));

function summary(m: Merchant) {
  const owner = m.ownerUserId ? db.users.get(m.ownerUserId) : undefined;
  return {
    id: m.id, name: m.name, stallNo: m.stallNo, tags: m.tags, phone: m.phone, approval: m.approval, owner: owner?.name, email: owner?.email, hours: m.hours,
    businessType: m.application?.business?.type ?? null,
    submittedAt: m.application?.agreedTermsAt ?? null, // when the merchant sent the sign-up (null for demo shops)
  };
}

// Newest sign-ups first; shops without an application (demo data) at the end.
adminRouter.get("/merchants", (req, res) => {
  const status = String(req.query.status ?? "");
  const list = [...db.merchants.values()]
    .filter((m) => !status || m.approval === status)
    .map(summary)
    .sort((a, b) => String(b.submittedAt ?? "").localeCompare(String(a.submittedAt ?? "")));
  res.json({ merchants: list });
});

// FR-6.2: everything the merchant sent in the sign-up wizard, so the admin can review it.
// Uploaded files get a `url` to open: photos keep their public URL, private certificates get a signed link (1 hour).
adminRouter.get("/merchants/:id", async (req, res) => {
  const m = db.merchants.get(req.params.id as string);
  if (!m) throw new HttpError(404, "Merchant not found");
  const dishes = [...db.dishes.values()]
    .filter((d) => d.merchantId === m.id)
    .map((d) => ({ id: d.id, name: d.name, price: d.price, description: d.description, imageUrl: d.imageUrl }));
  const application = m.application ? structuredClone(m.application) : null;
  for (const f of Object.values<any>(application?.files ?? {})) {
    if (f?.bucket && f?.path && !f.url) f.url = await signedUrl(f.bucket, f.path);
  }
  res.json({ merchant: { ...summary(m), prepMinutes: m.prepMinutes, storeMode: m.storeMode, lat: m.lat, lng: m.lng, application, dishes } });
});

adminRouter.patch("/merchants/:id", async (req, res) => {
  const m = db.merchants.get(req.params.id as string);
  if (!m) throw new HttpError(404, "Merchant not found");
  const approval = req.body?.approval;
  if (!["approved", "rejected", "suspended", "pending"].includes(approval)) throw new HttpError(400, "approval must be approved, rejected, suspended or pending");
  await setMerchantApproval(m.id, approval);
  m.approval = approval;
  notifyMerchant(m.id, "approval", `Business ${approval}`, approval === "approved" ? "Your business is live on ScootMeal." : `Your business was ${approval} by the admin.`);
  res.json({ merchant: { id: m.id, approval: m.approval } });
});
