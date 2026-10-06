/* ============================================
   Tests — Habits
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { isApplicable, habitTarget, habitValue, isDone, dayProgress } from "../src/utils/habits.js";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const MONDAY = "2026-10-05";
const profile = { water_goal: 8, sleep_goal: 7 };

const habit = (fields) => ({ id: "h", type: "bool", target: 1, days: ALL_DAYS, archived: false, source: null, ...fields });

const emptyCtx = () => ({ profile, habitLogs: [], waterLogs: [], workouts: [], meals: [], sleeps: [] });

test("isApplicable respeta los días y el archivado", () => {
  assert.equal(isApplicable(habit({ days: [1] }), MONDAY), true);
  assert.equal(isApplicable(habit({ days: [2, 3] }), MONDAY), false);
  assert.equal(isApplicable(habit({ archived: true }), MONDAY), false);
});

test("habitTarget: sí/no es 1, agua sale del perfil, el resto del hábito", () => {
  assert.equal(habitTarget(habit({ type: "bool", target: 5 }), profile), 1);
  assert.equal(habitTarget(habit({ type: "count", target: 3, source: "water" }), profile), 8);
  assert.equal(habitTarget(habit({ type: "count", target: 30, source: "workout_minutes" }), profile), 30);
});

test("habitValue manual lee habit_log del día", () => {
  const ctx = emptyCtx();
  ctx.habitLogs = [
    { habit_id: "h", date: MONDAY, value: 1 },
    { habit_id: "h", date: "2026-10-04", value: 1 },
    { habit_id: "otro", date: MONDAY, value: 1 },
  ];
  assert.equal(habitValue(habit({}), MONDAY, ctx), 1);
  assert.equal(habitValue(habit({}), "2026-10-03", ctx), 0);
});

test("habitValue con source suma desde los pilares", () => {
  const ctx = emptyCtx();
  ctx.workouts = [
    { date: MONDAY, duration_min: 20 },
    { date: MONDAY, duration_min: 15 },
    { date: "2026-10-04", duration_min: 60 },
  ];
  ctx.waterLogs = [{ date: MONDAY, glasses: 5 }];
  ctx.meals = [
    { date: MONDAY, tags: ["verdura", "integral"] },
    { date: MONDAY, tags: ["frito"] },
    { date: MONDAY, tags: ["verdura"] },
  ];
  ctx.sleeps = [{ date: MONDAY, hours: 7.5 }];

  assert.equal(habitValue(habit({ type: "count", source: "workout_minutes" }), MONDAY, ctx), 35);
  assert.equal(habitValue(habit({ type: "count", source: "water" }), MONDAY, ctx), 5);
  assert.equal(habitValue(habit({ type: "count", source: "meal_veggies" }), MONDAY, ctx), 2);
  assert.equal(habitValue(habit({ source: "sleep" }), MONDAY, ctx), 1);

  ctx.sleeps = [{ date: MONDAY, hours: 6.5 }];
  assert.equal(habitValue(habit({ source: "sleep" }), MONDAY, ctx), 0);
});

test("isDone compara el valor contra la meta", () => {
  const ctx = emptyCtx();
  ctx.waterLogs = [{ date: MONDAY, glasses: 8 }];
  assert.equal(isDone(habit({ type: "count", source: "water" }), MONDAY, ctx), true);
  ctx.waterLogs = [{ date: MONDAY, glasses: 7 }];
  assert.equal(isDone(habit({ type: "count", source: "water" }), MONDAY, ctx), false);
});

test("dayProgress cuenta solo los hábitos que aplican hoy", () => {
  const ctx = emptyCtx();
  const habits = [
    habit({ id: "a" }),
    habit({ id: "b" }),
    habit({ id: "c", days: [3] }), // no aplica el lunes
    habit({ id: "d", archived: true }),
  ];
  ctx.habitLogs = [{ habit_id: "a", date: MONDAY, value: 1 }];
  assert.deepEqual(dayProgress(habits, MONDAY, ctx), { done: 1, total: 2, percent: 50 });
});

test("dayProgress sin hábitos aplicables no divide por cero", () => {
  assert.deepEqual(dayProgress([], MONDAY, emptyCtx()), { done: 0, total: 0, percent: 0 });
});

test("weekProgress arma lunes a domingo con el progreso de cada día", async () => {
  const { weekProgress } = await import("../src/utils/habits.js");
  const ctx = emptyCtx();
  const habits = [habit({ id: "a" }), habit({ id: "b" })];
  // miércoles 7: los dos hechos; martes 6: uno; hoy jueves 8: ninguno
  ctx.habitLogs = [
    { habit_id: "a", date: "2026-10-07", value: 1 },
    { habit_id: "b", date: "2026-10-07", value: 1 },
    { habit_id: "a", date: "2026-10-06", value: 1 },
  ];

  const week = weekProgress(habits, "2026-10-08", ctx);

  assert.equal(week.length, 7);
  assert.equal(week[0].key, "2026-10-05");
  assert.equal(week[0].weekday, 1);       // lunes
  assert.equal(week[0].dayNumber, 5);
  assert.equal(week[1].level, "partial"); // martes: 1 de 2
  assert.equal(week[2].level, "full");    // miércoles: 2 de 2
  assert.equal(week[3].isToday, true);
  assert.equal(week[3].level, "none");
  assert.equal(week[4].isFuture, true);   // viernes
  assert.equal(week[4].level, "none");    // el futuro no se evalúa
});
