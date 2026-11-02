import { Router } from "express";
import { readFileToken } from "../../lib/fileLinks.js";
import { HttpError } from "../../lib/http.js";
import { readLocalPrivate, signedUrl } from "../../lib/storage.js";

/** Opens a private file from a short-lived link made by lib/fileLinks.ts (see GET /api/merchant/applications/:id). */
export const filesRouter = Router();

filesRouter.get("/:token", async (req, res) => {
  const ref = readFileToken(req.params.token as string);
  if (!ref) throw new HttpError(403, "This link has expired. Open the page again to get a new one.");
  const signed = await signedUrl(ref.bucket, ref.path, 300);
  if (signed) return res.redirect(signed);
  const data = await readLocalPrivate(ref.bucket, ref.path);
  if (!data) throw new HttpError(404, "File not found");
  res.setHeader("Content-Type", ref.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${ref.name.replace(/[^\w.\- ]/g, "_")}"`);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.send(data);
});
