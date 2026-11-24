// Run: cd backend && npx tsx --test tests/diet.test.ts
// Sprint 3 diet and allergy profile: which dishes get a red or amber label.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dietFit, dietSummary } from "../../apps/customer-app/src/modules/diet/diet.ts";
import { ALLERGENS } from "../src/lib/allergens.js";
import { ALLERGENS as APP_ALLERGENS } from "../../apps/customer-app/src/modules/diet/diet.ts";

const p = (x: any = {}) => ({ allergens: [], prefs: [], hideUnsuitable: false, ...x });

test("no profile: every dish is fine", () => {
  assert.deepEqual(dietFit({ allergens: ["Peanuts"] }, undefined, null), { level: "ok", reasons: [] });
  assert.equal(dietFit({ allergens: ["Peanuts"] }, undefined, p()).level, "ok");
});

test("a dish that contains one of my allergens is red", () => {
  const f = dietFit({ allergens: ["Peanuts", "Fish"] }, undefined, p({ allergens: ["Peanuts", "Milk"] }));
  assert.equal(f.level, "avoid");
  assert.deepEqual(f.reasons, ["Contains Peanuts"]);
});

test("diet rules: vegetarian, plant-based and no spicy", () => {
  assert.deepEqual(dietFit({ dietary: [] }, undefined, p({ prefs: ["vegetarian"] })).reasons, ["Not vegetarian"]);
  assert.equal(dietFit({ dietary: ["vegetarian"] }, undefined, p({ prefs: ["vegetarian"] })).level, "ok");
  assert.equal(dietFit({ dietary: ["plant_based"] }, undefined, p({ prefs: ["vegetarian"] })).level, "ok"); // plant-based counts as vegetarian
  assert.deepEqual(dietFit({ dietary: ["vegetarian"] }, undefined, p({ prefs: ["plant_based", "vegetarian"] })).reasons, ["Not plant-based"]);
  assert.deepEqual(dietFit({ dietary: ["spicy"], spicy: true }, undefined, p({ prefs: ["no_spicy"] })).reasons, ["Spicy"]);
});

test("nothing listed on the dish, but the kitchen uses my allergen: amber, ask the stall", () => {
  const f = dietFit({ allergens: [] }, { allergens: ["Peanuts", "Soy"] }, p({ allergens: ["Soy"] }));
  assert.deepEqual(f, { level: "check", reasons: ["Kitchen uses Soy"] });
  // a dish that lists its allergens (without mine) is trusted
  assert.equal(dietFit({ allergens: ["Egg"] }, { allergens: ["Soy"] }, p({ allergens: ["Soy"] })).level, "ok");
});

test("Account row summary", () => {
  assert.equal(dietSummary(null), "Not set");
  assert.equal(dietSummary(p({ allergens: ["Peanuts"], prefs: ["vegetarian"] })), "Peanuts, Vegetarian");
});

test("the app and the server use the same 9 allergen names", () => {
  assert.deepEqual([...APP_ALLERGENS], [...ALLERGENS]);
});
