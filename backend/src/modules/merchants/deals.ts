// Sprint 3 "last-hour deals": before closing, a stall sells leftover dishes at a discount for a short time.
// While a deal is on, customers simply see (and pay) the lower price; the normal price is shown crossed out.
// No database here, so it is easy to test (tests/deals.test.ts).

export type Deal = { percent: number; startedAt: number; endsAt: number };

export const PERCENT_CHOICES = [20, 30, 50] as const;
export const MAX_DEAL_MINUTES = 6 * 60;

/** The deal on a dish right now, or null if there is none or it has ended. */
export function activeDeal(d: { deal?: Deal }, now = Date.now()): Deal | null {
  return d.deal && d.deal.startedAt <= now && now < d.deal.endsAt ? d.deal : null;
}

/** Price after the discount, rounded to 10 sen like a stall would (never below RM 0.50). */
export function dealPrice(price: number, percent: number): number {
  // in whole sen first, so 8.50 at 30% off is 5.95 -> RM 6.00 (not 5.9 from a floating-point 5.9499...)
  return Math.max(0.5, Math.round((Math.round(price * 100) * (100 - percent)) / 1000) / 10);
}

/** What the customer pays for one portion right now. */
export function priceNow(d: { price: number; deal?: Deal }, now = Date.now()): number {
  const deal = activeDeal(d, now);
  return deal ? dealPrice(d.price, deal.percent) : d.price;
}

/** Minutes from "HH:MM" now until "HH:MM" closing time (closing after midnight counts as the next day). */
export function minutesUntil(close: string, nowHHMM: string): number {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return (toMin(close) - toMin(nowHHMM) + 1440) % 1440;
}

/** Checks a new deal from the merchant app and returns its length in minutes, or an error message. */
export function dealMinutes(b: any, minutesToClose: number): number | string {
  const percent = Number(b?.percent);
  if (!Number.isInteger(percent) || percent < 10 || percent > 70) return "Discount must be 10% to 70%";
  if (b?.untilClose === true) {
    if (minutesToClose < 5) return "The stall closes in less than 5 minutes";
    return Math.min(minutesToClose, MAX_DEAL_MINUTES);
  }
  const minutes = Number(b?.minutes);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > MAX_DEAL_MINUTES) return `A deal can run for 5 to ${MAX_DEAL_MINUTES} minutes`;
  return minutes;
}
