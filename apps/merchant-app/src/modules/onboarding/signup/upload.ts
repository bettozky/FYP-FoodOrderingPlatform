// Sends the sign-up photos and documents to the server after the account is created.
//   POST /api/merchant/uploads   (multipart/form-data, Authorization: Bearer <token>)
//   fields: kind = ssm_certificate | halal_certificate | logo | cover | menu_photo
//           index = 0..n (menu_photo only), file = the JPG / PNG / PDF (max 2 MB)
//   reply:  { url }  (public link for photos; null for certificates, which are private)
// Files that fail are returned so PendingApprovalScreen can say which ones and let the merchant try again.
import { apiUpload, errorText } from "../../../shared/api/client";
import type { PickKind } from "./pickFile";
import type { PickedFile, ShopApplication } from "./types";

export const UPLOAD_PATH = "/merchant/uploads";

export type UploadKind = "ssm_certificate" | "halal_certificate" | "logo" | "cover" | "menu_photo";
export type UploadJob = { kind: UploadKind; index?: number; label: string; file: PickedFile };
/** One file that did not upload, with the server's reason (e.g. "File must be 2 MB or smaller"). */
export type FailedUpload = { kind: UploadKind; index?: number; label: string; fileName: string; reason: string };

const LABELS: Record<Exclude<UploadKind, "menu_photo">, string> = {
  ssm_certificate: "SSM certificate",
  halal_certificate: "Halal certificate",
  logo: "Shop logo",
  cover: "Cover photo",
};

/** Certificates may be a PDF; everything else is a photo. */
export const pickKindFor = (kind: UploadKind): PickKind => (kind === "ssm_certificate" || kind === "halal_certificate" ? "document" : "image");

export function uploadJobs(a: ShopApplication): UploadJob[] {
  const jobs: UploadJob[] = [];
  if (a.ssmCertificate) jobs.push({ kind: "ssm_certificate", label: LABELS.ssm_certificate, file: a.ssmCertificate });
  if (a.halal && a.halalCertificate) jobs.push({ kind: "halal_certificate", label: LABELS.halal_certificate, file: a.halalCertificate });
  if (a.logo) jobs.push({ kind: "logo", label: LABELS.logo, file: a.logo });
  if (a.cover) jobs.push({ kind: "cover", label: LABELS.cover, file: a.cover });
  a.menuItems.forEach((m, i) => m.photo && jobs.push({ kind: "menu_photo", index: i, label: `Photo of "${m.name.trim() || `dish ${i + 1}`}"`, file: m.photo }));
  return jobs;
}

/** Uploads one file. Throws with the server's message if it fails. Needs the token to be set (setToken). */
export async function uploadFile(kind: UploadKind, file: PickedFile, index?: number): Promise<{ url: string | null }> {
  const fields: Record<string, string> = { kind };
  if (index !== undefined) fields.index = String(index);
  return apiUpload(UPLOAD_PATH, file, fields);
}

/** Uploads every chosen file one by one and returns the ones that failed (empty when all went up). */
export async function uploadSignupFiles(a: ShopApplication): Promise<FailedUpload[]> {
  const failed: FailedUpload[] = [];
  for (const job of uploadJobs(a)) {
    try {
      await uploadFile(job.kind, job.file, job.index);
    } catch (e) {
      failed.push({ kind: job.kind, index: job.index, label: job.label, fileName: job.file.name, reason: errorText(e) });
    }
  }
  return failed;
}
