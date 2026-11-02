import type { Request } from "express";
import { fileLink } from "../../lib/fileLinks.js";
import { db } from "../../store/db.js";
import type { ApplicationStatus, JobApplication, StoredDocument } from "../../store/types.js";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
/** Applications that still count (a withdrawn one is out of the running). */
export const isLive = (a: JobApplication) => a.status !== "withdrawn";

export function recountApplicants(jobId: string) {
  const j = db.jobs.get(jobId);
  if (j) j.applicants = [...db.applications.values()].filter((a) => a.jobId === jobId && isLive(a)).length;
}

export function setStatus(a: JobApplication, status: ApplicationStatus) {
  if (a.status !== status) { a.status = status; a.history.push({ status, at: Date.now() }); }
  a.updatedAt = Date.now();
}

const docView = (req: Request, d?: StoredDocument) => d && { name: d.name, size: d.size, mimeType: d.mimeType, url: fileLink(req, { bucket: d.bucket, path: d.path, name: d.name, mimeType: d.mimeType }) };
const docMeta = (d?: StoredDocument) => d && { name: d.name, size: d.size, mimeType: d.mimeType };

/** What the applicant sees of their own application (never the shop's private note). */
export function applicantView(a: JobApplication) {
  const { note: _note, documents, userId: _u, ...rest } = a;
  const job = db.jobs.get(a.jobId);
  return { ...rest, jobOpen: Boolean(job?.open), documents: { resume: docMeta(documents.resume), other: docMeta(documents.other) } };
}

/** One row in the shop's list of applicants. */
export function applicantSummary(a: JobApplication) {
  const u = db.users.get(a.userId);
  return {
    id: a.id, jobId: a.jobId, jobTitle: a.jobTitle, fullName: a.fullName, institution: a.institution, course: a.course,
    availableDays: a.availableDays, hoursPerWeek: a.hoursPerWeek, status: a.status, createdAt: a.createdAt,
    hasResume: Boolean(a.documents.resume), avatar: u?.avatar,
  };
}

/** Everything the shop needs to decide, with one-hour links to the documents. */
export function merchantDetail(req: Request, a: JobApplication) {
  const u = db.users.get(a.userId);
  const { documents, userId: _u, ...rest } = a;
  return { ...rest, avatar: u?.avatar, documents: { resume: docView(req, documents.resume), other: docView(req, documents.other) } };
}
