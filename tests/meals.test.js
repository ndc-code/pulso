/* ============================================
   Tests — Meals
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { dayScore, weekLevels, topTags, defaultSlot } from "../src/utils/meals.js";

const DAY = "2026-10-08"; // jueves
const meal = (date, tags, slot = "almuerzo") => ({ id: `${date}-${tags.join("-")}`, date, slot, tags, note: "" });

test("dayScore: sin comidas no hay nivel", () => {
  assert.equal(dayScore([], DAY).level, "none");
});

test("dayScore: buen día con 70% o más de positivos y al menos 2", () => {
  const meals = [meal(DAY, ["verdura", "integral"]), meal(DAY, ["fruta", "frito"])];
  const score = dayScore(meals, DAY); // 3 positivos, 1 a moderar → 75%
  assert.equal(score.positives, 3);
  assert.equal(score.moderates, 1);
  assert.equal(score.level, "good");
});

test("dayScore: un solo positivo no alcanza para buen día", () => {
  assert.equal(dayScore([meal(DAY, ["verdura"])], DAY).level, "mid");
});

test("dayScore: entre 40% y 70% es día medio", () => {
  const meals = [meal(DAY, ["verdura", "frito"])]; // 50%
  assert.equal(dayScore(meals, DAY).level, "mid");
});

test("dayScore: menos de 40% es día flojo", () => {
  const meals = [meal(DAY, ["ultraprocesado", "azucar"]), meal(DAY, ["fruta"])]; // 33%
  assert.equal(dayScore(meals, DAY).level, "low");
});

test("dayScore: solo cuenta las comidas de ese día", () => {
  const meals = [meal(DAY, ["frito"]), meal("2026-10-07", ["verdura", "fruta", "legumbre"])];
  assert.equal(dayScore(meals, DAY).level, "low");
});

test("weekLevels devuelve lunes a domingo; el futuro no tiene nivel", () => {
  const meals = [meal("2026-10-05", ["verdura", "fruta"]), meal(DAY, ["frito"])];
  const week = weekLevels(meals, DAY);
  assert.equal(week.length, 7);
  assert.equal(week[0].level, "good");
  assert.equal(week[1].level, "none");
  assert.equal(week[3].level, "low");
  assert.equal(week[3].isToday, true);
  assert.equal(week[4].isFuture, true);
});

test("topTags cuenta los chips de la semana, de más a menos frecuente", () => {
  const meals = [
    meal("2026-10-05", ["verdura", "fruta"]),
    meal("2026-10-06", ["verdura", "frito"]),
    meal(DAY, ["verdura", "frito", "fruta"]),
    meal("2026-09-30", ["legumbre"]), // semana anterior: no cuenta
  ];
  const { positives, moderates } = topTags(meals, DAY);
  assert.deepEqual(positives, [{ tag: "verdura", count: 3 }, { tag: "fruta", count: 2 }]);
  assert.deepEqual(moderates, [{ tag: "frito", count: 2 }]);
});

test("defaultSlot sugiere el momento según la hora", () => {
  assert.equal(defaultSlot(8), "desayuno");
  assert.equal(defaultSlot(13), "almuerzo");
  assert.equal(defaultSlot(17), "merienda");
  assert.equal(defaultSlot(21), "cena");
  assert.equal(defaultSlot(2), "snack");
});
