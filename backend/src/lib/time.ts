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
