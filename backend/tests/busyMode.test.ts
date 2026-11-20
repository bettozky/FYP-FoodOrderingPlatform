// Run: cd backend && npx tsx --test tests/busyMode.test.ts
// Sprint 3 busy mode / auto-pause: when a stall warns customers or stops taking orders.
import { test } from "node:test";
import assert from "node:assert/strict";
import { badBusyMode, busyRefusal, busyState } from "../src/modules/merchants/busyMode.js";

const warn = { on: true, limitMinutes: 20, action: "warn" as const };
const pause = { on: true, limitMinutes: 20, action: "pause" as const };

test("off, closed or under the limit: nothing changes", () => {
  assert.deepEqual(busyState(undefined, 50, true), { waitLimit: null, overLimit: false, ordersPaused: false, longWaitWarning: false });
  assert.equal(busyState({ ...pause, on: false }, 50, true).ordersPaused, false);
  assert.equal(busyState(pause, 50, false).ordersPaused, false);
  assert.equal(busyState(pause, 20, true).overLimit, false); // exactly at the limit is still fine
});

test("over the limit: 'warn' asks the customer, 'pause' stops new orders", () => {
  assert.deepEqual(busyState(warn, 21, true), { waitLimit: 20, overLimit: true, ordersPaused: false, longWaitWarning: true });
  assert.deepEqual(busyState(pause, 21, true), { waitLimit: 20, overLimit: true, ordersPaused: true, longWaitWarning: false });
});

test("orders: paused is always refused, warn only until the customer accepts the wait", () => {
  assert.match(busyRefusal("Ah Seng", pause, 32, true)!, /paused new orders.*32 min/);
  assert.match(busyRefusal("Ah Seng", warn, 32, false)!, /very busy.*32 min/);
  assert.equal(busyRefusal("Ah Seng", warn, 32, true), null);
  assert.equal(busyRefusal("Ah Seng", pause, 12, false), null); // auto-resumes once the queue is back under the limit
});

test("settings from the merchant app are checked", () => {
  assert.equal(badBusyMode(warn), null);
  assert.ok(badBusyMode({ ...warn, on: "yes" }));
  assert.ok(badBusyMode({ ...warn, limitMinutes: 2 }));
  assert.ok(badBusyMode({ ...warn, limitMinutes: 12.5 }));
  assert.ok(badBusyMode({ ...warn, action: "panic" }));
});
