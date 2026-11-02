import { Router, type RequestHandler } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http.js";
import { removeByUrl, removeObject, saveFile } from "../../lib/storage.js";
import { approvedMerchant, auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";

/** Photo and document uploads for merchants (multipart/form-data, one "file" field, max 5 MB). */
export const uploadsRouter = Router();
uploadsRouter.use(auth("merchant"));

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const DOCUMENT_TYPES: Record<string, string> = { ...PHOTO_TYPES, "application/pdf": "pdf" };
const FILE_KEYS: Record<string, string> = { ssm_certificate: "ssmCertificate", halal_certificate: "halalCertificate", logo: "logo", cover: "cover" };

/** The file extension if this really is a JPG / PNG / WebP picture (the first bytes are checked, not just the label). */
export function imageExt(file: Express.Multer.File | undefined): string | undefined {
  if (!file) return undefined;
  const b = file.buffer;
  const real = b[0] === 0xff && b[1] === 0xd8 ? "image/jpeg" : b.subarray(1, 4).toString() === "PNG" ? "image/png" : b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" ? "image/webp" : "";
  return real && real === file.mimetype ? PHOTO_TYPES[real] : undefined;
}

const single = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 } }).single("file");
const readFile: RequestHandler = (req, res, next) =>
  single(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) return next(new HttpError(400, err.code === "LIMIT_FILE_SIZE" ? `File must be ${env.maxUploadMb} MB or smaller` : "Send one file in the \"file\" field"));
    next(err);
  });

// Files from the shop sign-up (apps/merchant-app/src/modules/onboarding/signup/upload.ts).
// Sent right after the account is created, so a PENDING merchant may use this.
//   kind = ssm_certificate | halal_certificate  -> private storage, JPG / PNG / PDF; the admin opens it with a signed link
//   kind = logo | cover                         -> public shop photo
//   kind = menu_photo + index                   -> photo of the starter dish application.menuItems[index]
// Where the file went is saved on the shop's application (files.<key> or menuItems[index].photo).
uploadsRouter.post("/uploads", readFile, async (req, res) => {
  const u = currentUser(res);
  const m = u.merchantId ? db.merchants.get(u.merchantId) : undefined;
  if (!m) throw new HttpError(404, "No business profile");
  const file = req.file;
  if (!file) throw new HttpError(400, "Choose a file to upload");
  const kind = String(req.body?.kind ?? "");
  const isDocument = kind === "ssm_certificate" || kind === "halal_certificate";
  const ext = (isDocument ? DOCUMENT_TYPES : PHOTO_TYPES)[file.mimetype];
  if (!ext) throw new HttpError(400, isDocument ? "Certificate must be a JPG, PNG or PDF" : "Photo must be a JPG, PNG or WebP image");
  const meta = { name: file.originalname.slice(0, 120), size: file.size, mimeType: file.mimetype };
  const application: Record<string, any> = structuredClone(m.application ?? {});
  const stamp = Date.now();

  if (kind === "menu_photo") {
    const index = Number(req.body?.index);
    const item = Array.isArray(application.menuItems) ? application.menuItems[index] : undefined;
    if (!Number.isInteger(index) || !item) throw new HttpError(400, "index must point at one of the sign-up menu items");
    // Sign-up dishes are created from menuItems, so the name finds the dish.
    const dish = [...db.dishes.values()].find((d) => d.merchantId === m.id && d.name === String(item.name ?? "").trim());
    const { url } = await saveFile(env.menuPhotoBucket, `${m.id}/signup-${index}-${stamp}.${ext}`, file.buffer, file.mimetype, true);
    const oldUrls = new Set([item.photo?.url, dish?.image]);
    item.photo = { ...meta, url };
    m.application = application;
    if (dish) dish.image = url!;
    oldUrls.forEach((old) => removeByUrl(old));
    return res.status(201).json({ url });
  }

  const key = FILE_KEYS[kind];
  if (!key) throw new HttpError(400, "kind must be ssm_certificate, halal_certificate, logo, cover or menu_photo");
  application.files ??= {};
  const old = application.files[key];
  let url: string | null;
  if (isDocument) {
    const path = `${m.id}/${kind}-${stamp}.${ext}`;
    await saveFile(env.documentBucket, path, file.buffer, file.mimetype, false);
    application.files[key] = { ...meta, bucket: env.documentBucket, path };
    url = null; // private: never sent back as a public link
  } else {
    url = (await saveFile(env.shopPhotoBucket, `${m.id}/${kind}-${stamp}.${ext}`, file.buffer, file.mimetype, true)).url ?? null;
    application.files[key] = { ...meta, url };
  }
  m.application = application;
  if (old?.url) removeByUrl(old.url);
  else if (old?.bucket && old?.path) removeObject(old.bucket, old.path);
  res.status(201).json({ url });
});

// Dish photo (approved shops): the picture is saved in the dish's `image` field, which both apps already show.
uploadsRouter.post("/dishes/:id/image", readFile, async (req, res) => {
  const m = approvedMerchant(res);
  const d = db.dishes.get(req.params.id as string);
  if (!d || d.merchantId !== m.id) throw new HttpError(404, "Dish not found");
  const file = req.file;
  if (!file) throw new HttpError(400, "Choose a photo to upload");
  const ext = imageExt(file);
  if (!ext) throw new HttpError(400, "Photo must be a JPG, PNG or WebP image");
  // A new file name each time, so phones and browsers don't keep showing a cached old photo.
  const { url } = await saveFile(env.menuPhotoBucket, `${m.id}/${d.id}-${Date.now()}.${ext}`, file.buffer, file.mimetype, true);
  const old = d.image;
  d.image = url!;
  removeByUrl(old);
  res.json({ dish: d });
});

uploadsRouter.delete("/dishes/:id/image", (req, res) => {
  const m = approvedMerchant(res);
  const d = db.dishes.get(req.params.id as string);
  if (!d || d.merchantId !== m.id) throw new HttpError(404, "Dish not found");
  const old = d.image;
  d.image = "";
  removeByUrl(old);
  res.json({ dish: d });
});

// Shop profile photo (logo) and banner (cover) for an approved shop; customers see them on the shop card and page.
//   POST /api/merchant/shop-photo   form-data: file + kind (logo | cover)
//   DELETE /api/merchant/shop-photo?kind=logo
uploadsRouter.post("/shop-photo", readFile, async (req, res) => {
  const m = approvedMerchant(res);
  const kind = String(req.body?.kind ?? "");
  if (kind !== "logo" && kind !== "cover") throw new HttpError(400, "kind must be logo or cover");
  const ext = imageExt(req.file);
  if (!req.file || !ext) throw new HttpError(400, "Photo must be a JPG, PNG or WebP image");
  const { url } = await saveFile(env.shopPhotoBucket, `${m.id}/${kind}-${Date.now()}.${ext}`, req.file.buffer, req.file.mimetype, true);
  const old = m[kind];
  m[kind] = url!;
  removeByUrl(old);
  res.status(201).json({ url, logo: m.logo, cover: m.cover });
});
uploadsRouter.delete("/shop-photo", (req, res) => {
  const m = approvedMerchant(res);
  const kind = String(req.query.kind ?? "");
  if (kind !== "logo" && kind !== "cover") throw new HttpError(400, "kind must be logo or cover");
  removeByUrl(m[kind]);
  delete m[kind];
  res.json({ logo: m.logo, cover: m.cover });
});

/** My own profile photo (any signed-in role): POST /api/auth/me/avatar with a "file" field, DELETE to remove it. */
export const avatarRouter = Router();
avatarRouter.use(auth());
avatarRouter.post("/", readFile, async (req, res) => {
  const u = currentUser(res);
  const ext = imageExt(req.file);
  if (!req.file || !ext) throw new HttpError(400, "Photo must be a JPG, PNG or WebP image");
  const { url } = await saveFile(env.avatarBucket, `${u.id}/avatar-${Date.now()}.${ext}`, req.file.buffer, req.file.mimetype, true);
  const old = u.avatar;
  u.avatar = url!;
  if (old?.startsWith("http") || old?.startsWith("/media/")) removeByUrl(old);
  res.status(201).json({ avatar: u.avatar });
});
avatarRouter.delete("/", (_req, res) => {
  const u = currentUser(res);
  removeByUrl(u.avatar);
  delete u.avatar;
  res.json({ avatar: null });
});
