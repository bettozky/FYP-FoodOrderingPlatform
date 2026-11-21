import i18n from "i18next";
import type { ApplicationStatus } from "../../shared/api/types";
import { locale } from "../../shared/i18n";

// Labels are read in the app's current language each time (i18n getters).
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  get submitted() { return i18n.t("jobs.stSubmitted"); },
  get viewed() { return i18n.t("jobs.stViewed"); },
  get shortlisted() { return i18n.t("jobs.stShortlisted"); },
  get interview() { return i18n.t("jobs.stInterview"); },
  get hired() { return i18n.t("jobs.stHired"); },
  get rejected() { return i18n.t("jobs.stRejected"); },
  get withdrawn() { return i18n.t("jobs.stWithdrawn"); },
};
export const STATUS_TONE: Record<ApplicationStatus, "primary" | "success" | "warning" | "danger" | "neutral"> = {
  submitted: "neutral", viewed: "primary", shortlisted: "warning", interview: "warning", hired: "success", rejected: "danger", withdrawn: "neutral",
};
export const STATUS_HELP: Record<ApplicationStatus, string> = {
  get submitted() { return i18n.t("jobs.helpSubmitted"); },
  get viewed() { return i18n.t("jobs.helpViewed"); },
  get shortlisted() { return i18n.t("jobs.helpShortlisted"); },
  get interview() { return i18n.t("jobs.helpInterview"); },
  get hired() { return i18n.t("jobs.helpHired"); },
  get rejected() { return i18n.t("jobs.helpRejected"); },
  get withdrawn() { return i18n.t("jobs.helpWithdrawn"); },
};
export const DAY_LABEL: Record<string, string> = {
  get mon() { return i18n.t("spending.mon"); },
  get tue() { return i18n.t("spending.tue"); },
  get wed() { return i18n.t("spending.wed"); },
  get thu() { return i18n.t("spending.thu"); },
  get fri() { return i18n.t("spending.fri"); },
  get sat() { return i18n.t("spending.sat"); },
  get sun() { return i18n.t("spending.sun"); },
};
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
export const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.replace("T", " ") : d.toLocaleString(locale(), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
