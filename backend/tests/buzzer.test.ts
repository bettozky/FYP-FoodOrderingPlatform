// Run: cd backend && npx tsx --test tests/buzzer.test.ts
// Sprint 3 pickup buzzer: how the buzzer screen reads the stall's counter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { counterParts } from "../../apps/customer-app/src/modules/pickup/counter.ts";

test("splits 'Canteen A, Stall 3' into the counter and the canteen", () => {
  assert.deepEqual(counterParts("Canteen A, Stall 3"), { counter: "Stall 3", area: "Canteen A" });
  assert.deepEqual(counterParts("Main Hall · stall 12"), { counter: "stall 12", area: "Main Hall" });
});

test("other stall numbers are shown as they are, and missing ones fall back to 'the counter'", () => {
  assert.deepEqual(counterParts("Food truck"), { counter: "Food truck", area: "" });
  assert.deepEqual(counterParts(undefined), { counter: "the counter", area: "" });
  assert.deepEqual(counterParts("  "), { counter: "the counter", area: "" });
});
