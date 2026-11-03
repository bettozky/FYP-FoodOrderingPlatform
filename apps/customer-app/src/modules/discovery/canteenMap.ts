// Layout and colours for the Live Canteen Map (feature 1). No React here, so it is easy to test.
import type { BusyLevel, Merchant } from "../../shared/api/types";
import { colors } from "../../shared/theme/theme";

export type Slot = { slot: number; merchant?: Merchant };
export type Canteen = { name: string; slots: Slot[]; perRow: number };

/** "Canteen A, Stall 3" → { area: "Canteen A", slot: 3 }. Anything else keeps its text as the area. */
export function parseStallNo(stallNo: string): { area: string; slot: number | null } {
  const m = /^\s*(.+?)\s*[,·-]\s*Stall\s*(\d{1,3})\s*$/i.exec(stallNo || "");
  if (m) return { area: m[1], slot: Number(m[2]) };
  return { area: (stallNo || "").trim() || "Other stalls", slot: null };
}

/**
 * Groups stalls by canteen and places each one in its numbered counter.
 * Counters run along two walls (top row first), at least 8 per canteen so the room looks real.
 * Stalls without a number fill the first empty counters.
 */
export function buildCanteens(merchants: Merchant[]): Canteen[] {
  const byArea = new Map<string, { numbered: Map<number, Merchant>; loose: Merchant[] }>();
  for (const m of merchants) {
    const { area, slot } = parseStallNo(m.stallNo);
    const g = byArea.get(area) ?? { numbered: new Map<number, Merchant>(), loose: [] as Merchant[] };
    if (slot && !g.numbered.has(slot)) g.numbered.set(slot, m);
    else g.loose.push(m);
    byArea.set(area, g);
  }
  return [...byArea.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([name, g]) => {
      const highest = Math.max(0, ...g.numbered.keys());
      let count = Math.max(8, highest, g.numbered.size + g.loose.length);
      if (count % 2) count++;
      const slots: Slot[] = Array.from({ length: count }, (_, i) => ({ slot: i + 1, merchant: g.numbered.get(i + 1) }));
      for (const m of g.loose) {
        const free = slots.find((s) => !s.merchant);
        if (free) free.merchant = m;
      }
      return { name, slots, perRow: count / 2 };
    });
}

/** Older servers do not send `busy` yet: fall back to open / closed with the stall's own prep time. */
export function busyOf(m: Merchant): BusyLevel {
  if (!m.openNow) return "closed";
  if (m.busy) return m.busy;
  const wait = m.waitMinutes ?? m.prepMinutes;
  return wait <= 12 ? "quiet" : wait <= 20 ? "busy" : "very_busy";
}

export const waitOf = (m: Merchant) => m.waitMinutes ?? m.prepMinutes;

export const BUSY_STYLE: Record<BusyLevel, { label: string; dot: string; fill: string; border: string; text: string }> = {
  quiet: { label: "Quiet", dot: colors.herb, fill: colors.herbLight, border: colors.herb, text: colors.herb },
  busy: { label: "Busy", dot: colors.turmeric, fill: colors.amberTint, border: colors.turmeric, text: colors.amberText },
  very_busy: { label: "Very busy", dot: colors.chili, fill: colors.chiliSoft, border: colors.chili, text: colors.chiliText },
  closed: { label: "Closed", dot: colors.stone, fill: colors.paperDim, border: colors.stoneLine, text: colors.stoneText },
};

/** "3 quiet · 1 busy" for the Home card. */
export function busySummary(merchants: Merchant[]): { level: BusyLevel; count: number }[] {
  const order: BusyLevel[] = ["quiet", "busy", "very_busy", "closed"];
  const counts = new Map<BusyLevel, number>();
  for (const m of merchants) counts.set(busyOf(m), (counts.get(busyOf(m)) ?? 0) + 1);
  return order.filter((l) => counts.get(l)).map((level) => ({ level, count: counts.get(level)! }));
}
