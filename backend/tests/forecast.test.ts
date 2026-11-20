// Run: cd backend && npx tsx --test tests/forecast.test.ts
// Sprint 3 prep forecast: expected portions per dish from the same weekday in past weeks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, pastSameWeekdays, prepForecast, weekdayOf } from "../src/modules/merchants/forecast.js";

// Dates as plain UTC days and hours for the test (the route uses the stall's time zone).
const at = (date: string, hour: number) => Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
const dateOf = (ts: number) => new Date(ts).toISOString().slice(0, 10);
const hourOf = (ts: number) => new Date(ts).getUTCHours();
const o = (date: string, hour: number, items: [string, number][], x: any = {}) => ({
  merchantId: "m1", status: "completed", createdAt: at(date, hour),
  items: items.map(([dishId, qty]) => ({ dishId, name: dishId === "d1" ? "Beef Noodle Soup" : "Wantan Mee", qty, status: "collected" })), ...x,
});

test("calendar helpers", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(weekdayOf("2026-11-19"), 4); // Thursday
  assert.deepEqual(pastSameWeekdays("2026-11-19", 5, 3), ["2026-10-30", "2026-11-06", "2026-11-13"]); // Fridays before today
});

test("expected portions: recent weeks count more, with the range and trend", () => {
  // Fridays 23 Oct, 30 Oct, 6 Nov, 13 Nov: Beef Noodle Soup 2, 4, 4, 8 portions
  const orders = [
    o("2026-10-23", 12, [["d1", 2]]),
    o("2026-10-30", 12, [["d1", 4]]),
    o("2026-11-06", 12, [["d1", 3], ["d2", 1]]), o("2026-11-06", 18, [["d1", 1]]),
    o("2026-11-13", 12, [["d1", 5]]), o("2026-11-13", 13, [["d1", 3]]),
    o("2026-11-12", 12, [["d1", 50]]), // a Thursday: not used for a Friday forecast
    o("2026-11-13", 12, [["d1", 9]], { status: "rejected" }), // never cooked
    o("2026-11-13", 12, [["d2", 9]], { merchantId: "m2" }), // another stall
  ];
  const f = prepForecast({ orders, merchantId: "m1", target: "2026-11-20", today: "2026-11-19", dateOf, hourOf });
  assert.equal(f.weekday, 5);
  assert.deepEqual(f.dates, ["2026-10-23", "2026-10-30", "2026-11-06", "2026-11-13"]);
  const soup = f.dishes[0]!;
  assert.equal(soup.name, "Beef Noodle Soup");
  assert.deepEqual(soup.history, [2, 4, 4, 8]);
  assert.equal(soup.expected, 5); // (2*1 + 4*2 + 4*3 + 8*4) / 10 = 5.4
  assert.equal(soup.low, 2);
  assert.equal(soup.high, 8);
  assert.equal(soup.trend, "up");
  assert.deepEqual(f.dishes[1]!.history, [0, 0, 1, 0]);
  assert.equal(f.rushHour, 12);
  assert.equal(f.expectedOrders, 2); // 1, 1, 2, 2 orders -> 1.7
});

test("a new stall only uses the weeks it has been open; no orders gives an empty forecast", () => {
  const f = prepForecast({ orders: [o("2026-11-13", 12, [["d1", 3]])], merchantId: "m1", target: "2026-11-20", today: "2026-11-19", dateOf, hourOf });
  assert.deepEqual(f.dates, ["2026-11-13"]);
  assert.equal(f.dishes[0]!.expected, 3);
  const none = prepForecast({ orders: [], merchantId: "m1", target: "2026-11-20", today: "2026-11-19", dateOf, hourOf });
  assert.deepEqual(none.dishes, []);
  assert.equal(none.rushHour, null);
});
