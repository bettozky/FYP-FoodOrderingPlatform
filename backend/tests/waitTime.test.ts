// Run: cd backend && npx tsx --test tests/waitTime.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { busyLevel, estimateWait, isInQueue } from "../src/modules/merchants/waitTime.js";

const order = (merchantId: string, status: string, itemStatus = "preparing") =>
  ({ merchantId, status, items: [{ status: itemStatus }] }) as any;

test("an empty stall waits only its own prep time", () => {
  assert.deepEqual(estimateWait(12, [], "m1", true), { queue: 0, waitMinutes: 12, busy: "quiet" });
});

test("each order ahead adds half the prep time, rounded up", () => {
  const orders = [order("m1", "preparing"), order("m1", "awaiting_payment"), order("m2", "preparing")];
  assert.deepEqual(estimateWait(12, orders, "m1", true), { queue: 2, waitMinutes: 24, busy: "very_busy" });
  assert.equal(estimateWait(15, [order("m2", "preparing")], "m2", true).waitMinutes, 23);
});

test("orders that are done, waiting for the stall, or only have ready food do not count", () => {
  assert.equal(isInQueue(order("m1", "awaiting_merchant")), false);
  assert.equal(isInQueue(order("m1", "completed")), false);
  assert.equal(isInQueue(order("m1", "preparing", "ready")), false);
  assert.equal(isInQueue(order("m1", "preparing", "preparing")), true);
});

test("busy levels and closed stalls", () => {
  assert.equal(busyLevel(12, true), "quiet");
  assert.equal(busyLevel(13, true), "busy");
  assert.equal(busyLevel(20, true), "busy");
  assert.equal(busyLevel(21, true), "very_busy");
  assert.equal(busyLevel(5, false), "closed");
});

test("wait is capped at 90 minutes", () => {
  const many = Array.from({ length: 50 }, () => order("m1", "preparing"));
  assert.equal(estimateWait(20, many, "m1", true).waitMinutes, 90);
});
