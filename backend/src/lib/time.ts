import { env } from "../config/env.js";

/** Current local "HH:MM" in the configured time zone. */
export function localHHMM(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: env.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h === "24" ? "00" : h}:${m}`;
}

/** FR-1.6: is a merchant open now, based on its operating hours? Supports hours that pass midnight. */
export function isWithinHours(hours: { open: string; close: string }, now = new Date()): boolean {
  const t = localHHMM(now);
  if (hours.open <= hours.close) return t >= hours.open && t <= hours.close;
  return t >= hours.open || t <= hours.close;
}

/** Epoch ms of a local reservation slot (Malaysia is UTC+8 all year). */
export function slotEpoch(date: string, time: string): number {
  return new Date(`${date}T${time}:00+08:00`).getTime();
}

export function ageOn(dob: string, now = new Date()): number {
  const d = new Date(`${dob}T00:00:00Z`);
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

/** Day of the week in the configured time zone: 0 = Sunday ... 6 = Saturday. */
export function localDay(now = new Date()): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: env.timeZone, weekday: "short" }).format(now);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(w);
}

export interface DayHours { day: number; open: string; close: string }

/** Open right now? Uses the per-day hours when the shop set them (days without a row are closed), else the single open/close pair. */
export function isOpenNow(m: { hours: { open: string; close: string }; weeklyHours?: DayHours[] }, now = new Date()): boolean {
  if (!m.weeklyHours?.length) return isWithinHours(m.hours, now);
  const t = localHHMM(now);
  const today = localDay(now);
  const yesterday = (today + 6) % 7;
  return m.weeklyHours.some((h) => {
    if (h.day === today && (h.open <= h.close ? t >= h.open && t <= h.close : t >= h.open)) return true;
    return h.day === yesterday && h.open > h.close && t <= h.close; // yesterday's late-night hours running past midnight
  });
}
