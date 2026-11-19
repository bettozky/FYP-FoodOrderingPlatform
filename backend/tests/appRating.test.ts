// Run: cd backend && npx tsx --test tests/appRating.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ASK_AGAIN_AFTER_MS, appRatingSummary, shouldAskAppRating } from "../src/modules/feedback/feedback.service.js";

test("asks only after a completed order, and not again once rated or declined", () => {
  assert.equal(shouldAskAppRating({}, 0), false);
  assert.equal(shouldAskAppRating({}, 1), true);
  assert.equal(shouldAskAppRating({ appRating: { rating: 5, at: 1 } }, 3), false);
  assert.equal(shouldAskAppRating({ appRatingNever: true }, 3), false);
});

test("'Not now' waits 14 days before asking again", () => {
  const now = 100 * ASK_AGAIN_AFTER_MS;
  assert.equal(shouldAskAppRating({ appRatingAskedAt: now - 1000 }, 2, now), false);
  assert.equal(shouldAskAppRating({ appRatingAskedAt: now - ASK_AGAIN_AFTER_MS }, 2, now), true);
});

test("summary: average, star split and newest comments first", () => {
  const s = appRatingSummary([
    { name: "A", appRating: { rating: 5, at: 1, comment: "Great" } },
    { name: "B", appRating: { rating: 4, at: 3, comment: "Fast" } },
    { name: "C", appRating: { rating: 2, at: 2 } },
    { name: "D" },
  ]);
  assert.equal(s.count, 3);
  assert.equal(s.average, 3.7);
  assert.deepEqual(s.breakdown.map((b) => b.count), [0, 1, 0, 1, 1]);
  assert.deepEqual(s.latest.map((r) => r.name), ["B", "A"]);
  assert.equal(appRatingSummary([]).average, null);
});
