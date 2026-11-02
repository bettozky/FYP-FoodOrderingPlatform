export type ApplicationStatus = "submitted" | "viewed" | "shortlisted" | "interview" | "hired" | "rejected" | "withdrawn";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "New", viewed: "Viewed", shortlisted: "Shortlisted", interview: "Interview", hired: "Hired", rejected: "Rejected", withdrawn: "Withdrawn",
};
export const STATUS_TONE: Record<ApplicationStatus, "primary" | "success" | "warning" | "danger" | "neutral"> = {
  submitted: "primary", viewed: "neutral", shortlisted: "warning", interview: "warning", hired: "success", rejected: "danger", withdrawn: "neutral",
};
export const DAY_LABEL: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
export const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.replace("T", " ") : d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
