import type { ApplicationStatus } from "../../shared/api/types";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Sent", viewed: "Seen by shop", shortlisted: "Shortlisted", interview: "Interview", hired: "Hired", rejected: "Not successful", withdrawn: "Withdrawn",
};
export const STATUS_TONE: Record<ApplicationStatus, "primary" | "success" | "warning" | "danger" | "neutral"> = {
  submitted: "neutral", viewed: "primary", shortlisted: "warning", interview: "warning", hired: "success", rejected: "danger", withdrawn: "neutral",
};
export const STATUS_HELP: Record<ApplicationStatus, string> = {
  submitted: "Your application was sent. The shop has not opened it yet.",
  viewed: "The shop has opened your application.",
  shortlisted: "Good news: the shop shortlisted you.",
  interview: "The shop would like to meet you.",
  hired: "Congratulations! You got the job.",
  rejected: "The shop chose other candidates this time. Keep trying!",
  withdrawn: "You withdrew this application.",
};
export const DAY_LABEL: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.replace("T", " ") : d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
