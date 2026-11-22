import i18n, { locale } from "../../shared/i18n";

export type ApplicationStatus = "submitted" | "viewed" | "shortlisted" | "interview" | "hired" | "rejected" | "withdrawn";

// Labels follow the app language (read each time through i18n getters).
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
  submitted: "primary", viewed: "neutral", shortlisted: "warning", interview: "warning", hired: "success", rejected: "danger", withdrawn: "neutral",
};
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
/** "mon" -> "Mon" / "Isn" / "周一". */
export const DAY_LABEL: Record<string, string> = {};
for (const d of DAY_KEYS) Object.defineProperty(DAY_LABEL, d, { enumerable: true, get: () => i18n.t(`days.${d}Short`) });

// Job roles and types are stored in English (customers see them too); show them in the app language.
// Matched without caring about capitals ("Part-time" and "Part-Time" both come from the server).
const ROLE_KEY: Record<string, string> = { waitstaff: "waitstaff", "line cook": "lineCook", cashier: "cashier", barista: "barista", "kitchen helper": "kitchenHelper", dishwasher: "dishwasher", staff: "staff" };
const TYPE_KEY: Record<string, string> = { "full-time": "fullTime", "part-time": "partTime", contract: "contract" };
export const roleName = (r: string) => { const k = ROLE_KEY[r.trim().toLowerCase()]; return k ? i18n.t(`jobs.role_${k}` as "jobs.role_staff") : r; };
export const jobTypeName = (t: string) => { const k = TYPE_KEY[t.trim().toLowerCase()]; return k ? i18n.t(`jobs.type_${k}` as "jobs.type_fullTime") : t; };

export const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
export const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.replace("T", " ") : d.toLocaleString(locale(), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
