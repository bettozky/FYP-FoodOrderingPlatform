import { Router, type RequestHandler } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { HttpError, int, str } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { saveFile, removeObject } from "../../lib/storage.js";
import { approvedMerchant, auth, currentUser, optionalUser } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { db } from "../../store/db.js";
import type { ApplicationStatus, JobApplication, StoredDocument } from "../../store/types.js";
import { notify, notifyMerchant } from "../notifications/notifications.service.js";
import { DAYS, applicantSummary, applicantView, isLive, merchantDetail, recountApplicants, setStatus } from "./applications.service.js";

// ---------- customer: look at a vacancy and apply ----------
export const jobsRouter = Router();

const DOC_TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "application/pdf": { ext: "pdf", magic: (b) => b.subarray(0, 4).toString() === "%PDF" },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  "image/png": { ext: "png", magic: (b) => b.subarray(1, 4).toString() === "PNG" },
  "application/msword": { ext: "doc", magic: (b) => b[0] === 0xd0 && b[1] === 0xcf },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", magic: (b) => b[0] === 0x50 && b[1] === 0x4b },
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 2 } }).fields([{ name: "resume", maxCount: 1 }, { name: "other", maxCount: 1 }]);
const readFiles: RequestHandler = (req, res, next) =>
  upload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) return next(new HttpError(400, err.code === "LIMIT_FILE_SIZE" ? `Each file must be ${env.maxUploadMb} MB or smaller` : "Attach the CV in \"resume\" and any extra file in \"other\""));
    next(err);
  });

const jobOr404 = (id: string) => {
  const j = db.jobs.get(id);
  const m = j && db.merchants.get(j.merchantId);
  if (!j || !m || m.approval !== "approved") throw new HttpError(404, "This vacancy is no longer available");
  return j;
};

// One vacancy, with my application for it when I have one.
jobsRouter.get("/:id", optionalUser, (req, res) => {
  const j = jobOr404(req.params.id as string);
  const mine = res.locals.user && [...db.applications.values()].find((a) => a.jobId === j.id && a.userId === res.locals.user.id && isLive(a));
  const { applicants: _n, ...job } = j;
  res.json({ job, myApplication: mine ? applicantView(mine) : null });
});

const list = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String);
  const t = String(v ?? "").trim();
  if (!t) return [];
  if (t.startsWith("[")) { try { return (JSON.parse(t) as unknown[]).map(String); } catch { /* fall through */ } }
  return t.split(",").map((x) => x.trim()).filter(Boolean);
};

async function keep(file: Express.Multer.File | undefined, applicationId: string, kind: string): Promise<StoredDocument | undefined> {
  if (!file) return undefined;
  const type = DOC_TYPES[file.mimetype];
  if (!type || !type.magic(file.buffer)) throw new HttpError(400, "Attach a PDF, Word document, JPG or PNG");
  const path = `${applicationId}/${kind}-${Date.now()}.${type.ext}`;
  await saveFile(env.applicationBucket, path, file.buffer, file.mimetype, false);
  return { name: file.originalname.slice(0, 120), size: file.size, mimeType: file.mimetype, bucket: env.applicationBucket, path };
}

jobsRouter.post("/:id/applications", auth("customer"), rateLimit(20, "apply"), readFiles, async (req, res) => {
  const u = currentUser(res);
  const j = jobOr404(req.params.id as string);
  if (!j.open) throw new HttpError(409, "This vacancy is closed");
  const all = [...db.applications.values()].filter((a) => a.userId === u.id);
  if (all.some((a) => a.jobId === j.id && isLive(a))) throw new HttpError(409, "You have already applied for this job");
  if (all.filter((a) => ["submitted", "viewed", "shortlisted", "interview"].includes(a.status)).length >= 10) throw new HttpError(400, "You have 10 applications in progress. Wait for replies or withdraw one first.");

  const b = req.body ?? {};
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  const email = str(b.email ?? u.email, "Email", { max: 120 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Enter a valid email address");
  const availableDays = [...new Set(list(b.availableDays).map((d) => d.toLowerCase()))];
  if (!availableDays.length || availableDays.some((d) => !(DAYS as readonly string[]).includes(d))) throw new HttpError(400, "Choose the days you can work (mon, tue, ...)");
  if (String(b.eligibleToWork) !== "true") throw new HttpError(400, "Please confirm that you are allowed to work part-time");
  const startDate = str(b.startDate, "Start date", { optional: true, max: 10 });
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new HttpError(400, "Start date must look like 2026-12-01");
  const experience = str(b.experience, "Experience", { optional: true, max: 600 });
  if (!files.resume?.[0] && experience.length < 10) throw new HttpError(400, "Attach your CV, or describe your experience in a few words");

  const id = uid("app");
  const now = Date.now();
  const stored: JobApplication["documents"] = {};
  try {
    stored.resume = await keep(files.resume?.[0], id, "resume");
    stored.other = await keep(files.other?.[0], id, "other");
  } catch (e) {
    for (const d of Object.values(stored)) if (d) removeObject(d.bucket, d.path);
    throw e;
  }
  const a: JobApplication = {
    id, jobId: j.id, jobTitle: j.title, merchantId: j.merchantId, merchantName: j.merchantName, userId: u.id,
    fullName: str(b.fullName ?? u.name, "Full name", { max: 80 }), email, phone: str(b.phone ?? u.phone, "Phone number", { max: 30 }),
    institution: str(b.institution, "University", { optional: true, max: 80 }) || undefined,
    course: str(b.course, "Course", { optional: true, max: 80 }) || undefined,
    yearOfStudy: str(b.yearOfStudy, "Year of study", { optional: true, max: 30 }) || undefined,
    availableDays, hoursPerWeek: b.hoursPerWeek === undefined || b.hoursPerWeek === "" ? undefined : int(b.hoursPerWeek, "Hours per week", 1, 60),
    startDate: startDate || undefined, experience: experience || undefined,
    languages: str(b.languages, "Languages", { optional: true, max: 100 }) || undefined,
    hasTransport: b.hasTransport === undefined || b.hasTransport === "" ? undefined : String(b.hasTransport) === "true",
    eligibleToWork: true, message: str(b.message, "Message", { optional: true, max: 500 }) || undefined,
    documents: stored, status: "submitted", history: [{ status: "submitted", at: now }], createdAt: now, updatedAt: now,
  };
  db.applications.set(a.id, a);
  recountApplicants(j.id);
  notifyMerchant(j.merchantId, "job_application", "New job applicant", `${a.fullName} applied for ${j.title}`, { applicationId: a.id, jobId: j.id });
  res.status(201).json({ application: applicantView(a) });
});

// ---------- customer: my applications ----------
export const applicationsRouter = Router();
applicationsRouter.use(auth("customer"));

const mine = (userId: string, id: string) => {
  const a = db.applications.get(id);
  if (!a || a.userId !== userId) throw new HttpError(404, "Application not found");
  return a;
};

applicationsRouter.get("/", (_req, res) => {
  const u = currentUser(res);
  const applications = [...db.applications.values()].filter((a) => a.userId === u.id).sort((a, b) => b.createdAt - a.createdAt).map(applicantView);
  res.json({ applications });
});
applicationsRouter.get("/:id", (req, res) => res.json({ application: applicantView(mine(currentUser(res).id, req.params.id as string)) }));

applicationsRouter.post("/:id/withdraw", (req, res) => {
  const a = mine(currentUser(res).id, req.params.id as string);
  if (["hired", "withdrawn"].includes(a.status)) throw new HttpError(409, a.status === "hired" ? "You were hired. Talk to the shop to cancel." : "Already withdrawn");
  setStatus(a, "withdrawn");
  recountApplicants(a.jobId);
  notifyMerchant(a.merchantId, "job_application", "Application withdrawn", `${a.fullName} withdrew from ${a.jobTitle}`, { applicationId: a.id });
  res.json({ application: applicantView(a) });
});

// ---------- merchant: applicants inbox ----------
export const merchantApplicationsRouter = Router();
merchantApplicationsRouter.use(auth("merchant"));

const shopApplication = (res: any, id: string) => {
  const m = approvedMerchant(res);
  const a = db.applications.get(id);
  if (!a || a.merchantId !== m.id) throw new HttpError(404, "Application not found");
  return a;
};

// ?jobId=  ?status=  ?q=name
merchantApplicationsRouter.get("/", (req, res) => {
  const m = approvedMerchant(res);
  const jobId = String(req.query.jobId ?? "");
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const mineAll = [...db.applications.values()].filter((a) => a.merchantId === m.id && (!jobId || a.jobId === jobId));
  const counts: Record<string, number> = { all: mineAll.length };
  for (const a of mineAll) counts[a.status] = (counts[a.status] ?? 0) + 1;
  const status = String(req.query.status ?? "");
  const shown = mineAll.filter((a) => (!status || a.status === status) && (!q || `${a.fullName} ${a.institution ?? ""}`.toLowerCase().includes(q))).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ counts, applications: shown.map(applicantSummary) });
});

// Opening an application marks a new one as "viewed".
merchantApplicationsRouter.get("/:id", (req, res) => {
  const a = shopApplication(res, req.params.id as string);
  if (a.status === "submitted") setStatus(a, "viewed");
  res.json({ application: merchantDetail(req, a) });
});

const SHOP_STATUSES: ApplicationStatus[] = ["viewed", "shortlisted", "interview", "hired", "rejected"];
const STATUS_TEXT: Record<string, string> = {
  shortlisted: "You have been shortlisted", interview: "You are invited to an interview", hired: "Congratulations, you got the job", rejected: "Your application was not successful",
};

merchantApplicationsRouter.patch("/:id", (req, res) => {
  const a = shopApplication(res, req.params.id as string);
  const b = req.body ?? {};
  if (a.status === "withdrawn") throw new HttpError(409, "The applicant withdrew this application");
  if (b.note !== undefined) a.note = str(b.note, "Note", { optional: true, max: 500 }) || undefined;
  if (b.status !== undefined) {
    if (!SHOP_STATUSES.includes(b.status)) throw new HttpError(400, `status must be one of ${SHOP_STATUSES.join(", ")}`);
    if (b.status === "interview") {
      const at = str(b.interview?.at, "Interview time", { max: 40 });
      if (Number.isNaN(Date.parse(at))) throw new HttpError(400, "Interview time must be a date and time, e.g. 2026-11-10T15:00");
      a.interview = { at, place: str(b.interview?.place, "Place", { optional: true, max: 120 }) || undefined, message: str(b.interview?.message, "Message", { optional: true, max: 300 }) || undefined };
    }
    const changed = a.status !== b.status;
    setStatus(a, b.status);
    if (changed && STATUS_TEXT[b.status]) {
      const extra = b.status === "interview" && a.interview ? ` on ${a.interview.at.replace("T", " ")}${a.interview.place ? ` at ${a.interview.place}` : ""}` : "";
      notify(a.userId, "job_application", STATUS_TEXT[b.status]!, `${a.merchantName} · ${a.jobTitle}${extra}`, { applicationId: a.id });
    }
  }
  a.updatedAt = Date.now();
  res.json({ application: merchantDetail(req, a) });
});

export { isLive };
