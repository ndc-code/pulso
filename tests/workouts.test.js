/* ============================================
   Tests — Workouts
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { weekSummary, minutesByDay, groupByWeek } from "../src/utils/workouts.js";

// Jueves 8 de octubre de 2026; la semana va del lunes 5 al domingo 11
const TODAY = "2026-10-08";

const workouts = [
  { id: "a", date: "2026-10-05", type: "cardio", duration_min: 30, intensity: "media" },
  { id: "b", date: "2026-10-05", type: "fuerza", duration_min: 20, intensity: "intensa" },
  { id: "c", date: "2026-10-07", type: "caminata", duration_min: 40, intensity: "suave" },
  { id: "d", date: "2026-10-04", type: "deporte", duration_min: 60, intensity: "media" }, // domingo anterior
  { id: "e", date: "2026-09-28", type: "cardio", duration_min: 25, intensity: "media" },  // dos semanas antes
];

test("weekSummary suma solo la semana actual (lunes a domingo)", () => {
  const summary = weekSummary(workouts, TODAY, 150);
  assert.equal(summary.minutes, 90);
  assert.equal(summary.sessions, 3);
  assert.equal(summary.activeDays, 2);
  assert.equal(summary.remaining, 60);
  assert.equal(summary.percent, 60);
});

test("weekSummary: pasarse de la meta deja remaining en 0 y percent en 100", () => {
  const many = [{ date: TODAY, duration_min: 200 }];
  const summary = weekSummary(many, TODAY, 150);
  assert.equal(summary.remaining, 0);
  assert.equal(summary.percent, 100);
});

test("weekSummary: el promedio diario cuenta los días transcurridos, no los 7", () => {
  // lunes a jueves = 4 días transcurridos, 90 min → 22.5 → 23
  assert.equal(weekSummary(workouts, TODAY, 150).dailyAverage, 23);
});

test("minutesByDay devuelve lunes a domingo con los minutos de cada día", () => {
  const days = minutesByDay(workouts, TODAY);
  assert.equal(days.length, 7);
  assert.deepEqual(days.map((d) => d.minutes), [50, 0, 40, 0, 0, 0, 0]);
  assert.equal(days[3].isToday, true);
  assert.equal(days[4].isFuture, true);
});

test("groupByWeek agrupa por semana, de la más nueva a la más vieja", () => {
  const weeks = groupByWeek(workouts);
  // el domingo 4 pertenece a la semana que empieza el lunes 28
  assert.deepEqual(weeks.map((w) => w.weekStart), ["2026-10-05", "2026-09-28"]);
  assert.equal(weeks[0].minutes, 90);
  assert.equal(weeks[1].minutes, 85);
  // dentro de cada semana, de la sesión más nueva a la más vieja
  assert.deepEqual(weeks[0].workouts.map((w) => w.id), ["c", "a", "b"]);
});

test("activityGrid arma columnas de semanas (lunes a domingo) con los días activos", async () => {
  const { activityGrid } = await import("../src/utils/workouts.js");
  const grid = activityGrid(workouts, TODAY, 3);

  // 3 semanas: la actual y las 2 anteriores, de la más vieja a la más nueva
  assert.equal(grid.length, 3);
  assert.equal(grid[0][0].key, "2026-09-21");
  assert.equal(grid[2][0].key, "2026-10-05");
  grid.forEach((week) => assert.equal(week.length, 7));

  const day = (key) => grid.flat().find((d) => d.key === key);
  assert.equal(day("2026-10-05").active, true);
  assert.equal(day("2026-10-06").active, false);
  assert.equal(day("2026-10-04").active, true);   // domingo, semana anterior
  assert.equal(day("2026-09-28").active, true);
  assert.equal(day("2026-10-08").isToday, true);
  assert.equal(day("2026-10-09").isFuture, true);
});

test("weekSummary de una semana pasada promedia sobre los 7 días", () => {
  // se consulta la semana del lunes 28 de septiembre (ya terminada) desde el jueves 8
  const summary = weekSummary(workouts, "2026-09-28", 150, TODAY);
  assert.equal(summary.minutes, 85);               // 25 (lunes 28) + 60 (domingo 4)
  assert.equal(summary.dailyAverage, Math.round(85 / 7));
});
