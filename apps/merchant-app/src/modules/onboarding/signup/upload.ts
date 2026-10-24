// Sends the sign-up photos and documents to the server after the account is created.
//
// The upload endpoint is David's (merchants / uploads module). Until it exists this returns
// { skipped: true } on a 404 so sign-up still completes; the application already tells the
// admin which files were chosen (see toSignupRequest -> application.files).
//
// Agreed shape, to confirm with David in the group chat before he builds it:
//   POST /api/merchant/uploads   (multipart/form-data, Authorization: Bearer <token>)
//   fields: kind = ssm_certificate | halal_certificate | logo | cover | menu_photo
//           index = 0..n (menu_photo only), file = the JPG / PNG / PDF (max 2 MB)
//   reply:  { url }  (public link for photos; private storage for certificates)
import { API_URL } from "../../../shared/config";
import type { PickedFile, ShopApplication } from "./types";

export const UPLOAD_PATH = "/merchant/uploads";

export type UploadKind = "ssm_certificate" | "halal_certificate" | "logo" | "cover" | "menu_photo";
type Job = { kind: UploadKind; index?: number; file: PickedFile };

export function uploadJobs(a: ShopApplication): Job[] {
  const jobs: Job[] = [];
  if (a.ssmCertificate) jobs.push({ kind: "ssm_certificate", file: a.ssmCertificate });
  if (a.halal && a.halalCertificate) jobs.push({ kind: "halal_certificate", file: a.halalCertificate });
  if (a.logo) jobs.push({ kind: "logo", file: a.logo });
  if (a.cover) jobs.push({ kind: "cover", file: a.cover });
  a.menuItems.forEach((m, i) => m.photo && jobs.push({ kind: "menu_photo", index: i, file: m.photo }));
  return jobs;
}

export async function uploadSignupFiles(token: string, a: ShopApplication): Promise<{ uploaded: number; skipped: boolean; failed: number }> {
  let uploaded = 0;
  let failed = 0;
  for (const job of uploadJobs(a)) {
    const form = new FormData();
    form.append("kind", job.kind);
    if (job.index !== undefined) form.append("index", String(job.index));
    // Web gives a real File; on phones React Native accepts { uri, name, type }.
    form.append("file", (job.file.file ?? { uri: job.file.uri, name: job.file.name, type: job.file.mimeType }) as any);
    try {
      const res = await fetch(`${API_URL}/api${UPLOAD_PATH}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      if (res.status === 404) return { uploaded, skipped: true, failed };
      if (res.ok) uploaded++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { uploaded, skipped: false, failed };
}
