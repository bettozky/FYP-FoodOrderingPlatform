// Run: cd backend && npx tsx --test tests/arrival.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { orderReadyMinutes } from "../src/modules/merchants/waitTime.js";
import { canSayArriving, setArriving } from "../src/modules/arrival/arrival.service.js";

const MIN = 60000;
const o = (id: string, x: any = {}) =>
  ({ id, merchantId: "m1", status: "preparing", createdAt: 0, acceptedAt: 0, items: [{ mode: "takeaway", status: "preparing" }], customerName: "Demo", ...x }) as any;

test("first order in the queue: the stall's prep time, minus time already cooking", () => {
  const a = o("a", { acceptedAt: 0, paidAt: 0 });
  assert.equal(orderReadyMinutes(a, [a], 12, 0), 12);
  assert.equal(orderReadyMinutes(a, [a], 12, 5 * MIN), 7);
  assert.equal(orderReadyMinutes(a, [a], 12, 30 * MIN), 1); // late food still says 1 min, never 0 or negative
});

test("orders accepted earlier at the same stall push this one back", () => {
  const first = o("a", { acceptedAt: 1 });
  const second = o("b", { acceptedAt: 2, status: "awaiting_payment" });
  const other = o("c", { merchantId: "m2", acceptedAt: 0 });
  assert.equal(orderReadyMinutes(second, [first, second, other], 12, 2), 18); // not paid yet: no cooking time taken off
});

test("nothing left to cook gives null", () => {
  assert.equal(orderReadyMinutes(o("a", { items: [{ mode: "takeaway", status: "ready" }] }), [], 12), null);
  assert.equal(orderReadyMinutes(o("a", { status: "completed" }), [], 12), null);
});

test("'I'm on my way' only for dine-in or takeaway food still to collect", () => {
  assert.equal(canSayArriving(o("a")), true);
  assert.equal(canSayArriving(o("a", { items: [{ mode: "delivery", status: "preparing" }] })), false);
  assert.equal(canSayArriving(o("a", { status: "awaiting_merchant" })), false);
  assert.equal(canSayArriving(o("a", { items: [{ mode: "dine_in", status: "collected" }] })), false);
});

test("setArriving stores the arrival time and rejects bad input", () => {
  const a = o("a");
  setArriving(a, 5, 1000);
  assert.equal(a.arrivingAt, 1000 + 5 * MIN);
  assert.throws(() => setArriving(o("b"), 0));
  assert.throws(() => setArriving(o("c", { status: "completed" }), 5));
});
