// Run: cd backend && npx tsx --test tests/deals.test.ts
// Sprint 3 last-hour deals: prices, how long a deal runs, and when it ends.
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeDeal, dealMinutes, dealPrice, minutesUntil, priceNow } from "../src/modules/merchants/deals.js";

test("deal price: rounded to 10 sen, never below RM 0.50", () => {
  assert.equal(dealPrice(8.5, 30), 6);
  assert.equal(dealPrice(7, 20), 5.6);
  assert.equal(dealPrice(6.5, 50), 3.3);
  assert.equal(dealPrice(0.8, 70), 0.5);
});

test("a deal only counts between its start and end", () => {
  const d = { price: 10, deal: { percent: 50, startedAt: 100, endsAt: 200 } };
  assert.equal(activeDeal(d, 99), null);
  assert.ok(activeDeal(d, 150));
  assert.equal(activeDeal(d, 200), null);
  assert.equal(priceNow(d, 150), 5);
  assert.equal(priceNow(d, 250), 10); // back to the normal price once it ends
  assert.equal(priceNow({ price: 10 }, 150), 10);
});

test("minutes until closing, including after midnight", () => {
  assert.equal(minutesUntil("21:00", "20:15"), 45);
  assert.equal(minutesUntil("01:00", "23:30"), 90);
});

test("deal length: fixed minutes or until closing, with limits", () => {
  assert.equal(dealMinutes({ percent: 30, minutes: 60 }, 300), 60);
  assert.equal(dealMinutes({ percent: 30, untilClose: true }, 45), 45);
  assert.equal(dealMinutes({ percent: 30, untilClose: true }, 900), 360); // capped at 6 hours
  assert.equal(typeof dealMinutes({ percent: 30, untilClose: true }, 3), "string");
  assert.equal(typeof dealMinutes({ percent: 90, minutes: 60 }, 300), "string");
  assert.equal(typeof dealMinutes({ percent: 30, minutes: 2 }, 300), "string");
});
