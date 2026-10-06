/* ============================================
   Tests — Progress
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyReport, consistencyGrid, dayLevel } from "../src/utils/progress.js";

const TODAY = "2026-10-08"; // jueves
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const habit = (id) => ({ id, name: id, type: "bool", target: 1, unit: "", source: null, days: ALL_DAYS, order: 0, archived: false });
const log = (habit_id, date) => ({ id: `${habit_id}-${date}`, habit_id, date, value: 1 });

function context({ habits = [habit("a"), habit("b")], habitLogs = [], workouts = [], meals = [], sleeps = [] } = {}) {
  return {
    profile: { water_goal: 8, sleep_goal: 7, weekly_active_goal: 150 },
    habits,
    habitLogs,
    waterLogs: [],
    workouts,
    meals,
    sleeps,
  };
}

test("dayLevel: completo, a medias, algo y nada", () => {
  assert.equal(dayLevel({ done: 2, total: 2 }), "good");
  assert.equal(dayLevel({ done: 2, total: 4 }), "mid");
  assert.equal(dayLevel({ done: 1, total: 4 }), "low");
  assert.equal(dayLevel({ done: 0, total: 4 }), "none");
  assert.equal(dayLevel({ done: 0, total: 0 }), "none");
});

test("weeklyReport: cumplimiento de hábitos de lunes a hoy", () => {
  // lunes 5 al jueves 8: 4 días × 2 hábitos = 8; cumplidos 3
  const ctx = context({ habitLogs: [log("a", "2026-10-05"), log("b", "2026-10-05"), log("a", "2026-10-07")] });
  const report = weeklyReport(ctx, TODAY);
  assert.equal(report.habits.done, 3);
  assert.equal(report.habits.total, 8);
  assert.equal(report.habits.percent, 38);
});

test("weeklyReport: minutos activos, días buenos de comida y sueño de la semana", () => {
  const ctx = context({
    workouts: [
      { date: "2026-10-05", duration_min: 30 },
      { date: "2026-10-07", duration_min: 45 },
      { date: "2026-10-01", duration_min: 60 }, // semana anterior
    ],
    meals: [
      { date: "2026-10-06", tags: ["verdura", "fruta"] },
      { date: "2026-10-07", tags: ["frito"] },
    ],
    sleeps: [
      { date: "2026-10-06", hours: 7 },
      { date: "2026-10-07", hours: 6 },
    ],
  });
  const report = weeklyReport(ctx, TODAY);
  assert.equal(report.minutes, 75);
  assert.equal(report.goodFoodDays, 1);
  assert.equal(report.foodDays, 2);
  assert.equal(report.sleepAverage, 6.5);
  assert.equal(report.sleepNights, 2);
});

test("weeklyReport: semana vacía", () => {
  const report = weeklyReport(context({ habits: [] }), TODAY);
  assert.equal(report.habits.percent, 0);
  assert.equal(report.minutes, 0);
  assert.equal(report.sleepAverage, null);
});

test("consistencyGrid: columnas de semanas, lunes a domingo, la última es la actual", () => {
  const grid = consistencyGrid([habit("a")], TODAY, context({ habits: [habit("a")] }), 4);
  assert.equal(grid.length, 4);
  assert.equal(grid[0].length, 7);
  assert.equal(grid[3][0].key, "2026-10-05");
  assert.equal(grid[0][0].key, "2026-09-14");
  assert.equal(grid[3][3].isToday, true);
  assert.equal(grid[3][4].isFuture, true);
});

test("consistencyGrid: nivel por día según los hábitos cumplidos", () => {
  const habits = [habit("a"), habit("b")];
  const ctx = context({ habits, habitLogs: [log("a", "2026-10-06"), log("b", "2026-10-06"), log("a", "2026-10-07")] });
  const week = consistencyGrid(habits, TODAY, ctx, 1)[0];
  assert.equal(week[0].level, "none");
  assert.equal(week[1].level, "good");
  assert.equal(week[2].level, "mid");
  assert.equal(week[4].level, "none"); // futuro
});
