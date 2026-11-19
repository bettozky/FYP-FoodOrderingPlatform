// Run: cd backend && npx tsx --test tests/spending.test.ts
// Sprint 3 spending tracker and weekly budget: what counts as spent, the weekly totals and the budget warning.
import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetState, spendingSummary, spentOn, weekStart } from "../../apps/customer-app/src/modules/spending/spending.ts";

const DAY = 86400000;
// Thursday 19 Nov 2026, 12:00 local time
const NOW = new Date(2026, 10, 19, 12, 0, 0).getTime();
const o = (x: any) => ({ merchantName: "Ah Seng", total: 10, refunded: 0, status: "completed", createdAt: NOW - DAY, ...x });

test("only money that was really spent counts, minus refunds", () => {
  assert.equal(spentOn(o({})), 10);
  assert.equal(spentOn(o({ refunded: 3.5 })), 6.5);
  assert.equal(spentOn(o({ status: "awaiting_payment" })), 0); // confirmed but not paid yet
  assert.equal(spentOn(o({ status: "expired" })), 0);
  assert.equal(spentOn(o({ status: "cancelled", paidAt: NOW, refunded: 10 })), 0); // paid then fully refunded
  assert.equal(spentOn(o({ status: "preparing" })), 10); // cash orders being cooked
});

test("weeks start on Monday at midnight", () => {
  const mon = new Date(weekStart(NOW));
  assert.equal(mon.getDay(), 1);
  assert.equal(mon.getDate(), 16);
  assert.equal(mon.getHours(), 0);
  assert.equal(weekStart(mon.getTime()), mon.getTime());
});

test("this week, this month, 8 weekly bars and Monday to Sunday", () => {
  const orders = [
    o({ total: 12, paidAt: NOW - 1 * DAY }), // Wed this week
    o({ total: 8, paidAt: NOW }), // Thu (today)
    o({ total: 20, paidAt: NOW - 7 * DAY, merchantName: "Mak Cik" }), // last week
    o({ total: 99, paidAt: NOW - 70 * DAY }), // too old for the bars
    o({ total: 5, status: "rejected" }),
  ];
  const s = spendingSummary(orders, NOW);
  assert.equal(s.thisWeek, 20);
  assert.equal(s.weeks.length, 8);
  assert.equal(s.weeks[7].label, "This wk");
  assert.equal(s.weeks[7].total, 20);
  assert.equal(s.weeks[6].total, 20);
  assert.equal(s.weeks.reduce((t, w) => t + w.total, 0), 40);
  assert.deepEqual(s.days.map((d) => d.total), [0, 0, 12, 8, 0, 0, 0]);
  assert.equal(s.days.find((d) => d.isToday)?.label, "Thu");
  assert.equal(s.thisMonth, 40); // 12 Nov is still November
  assert.equal(s.orderCount, 3);
  assert.deepEqual(s.topStalls.map((t) => [t.name, t.total, t.count]), [["Ah Seng", 20, 2], ["Mak Cik", 20, 1]]);
});

test("budget: ok, near (80%+) and over, and nothing without a budget", () => {
  assert.equal(budgetState(10, null).level, "none");
  assert.deepEqual(budgetState(20, 50), { level: "ok", left: 30, percent: 40 });
  assert.deepEqual(budgetState(30, 50, 12), { level: "near", left: 8, percent: 84 });
  assert.deepEqual(budgetState(45, 50, 9.5), { level: "over", left: -4.5, percent: 109 });
});
