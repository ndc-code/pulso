/* ============================================
   Tests — Habits
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { isApplicable, habitTarget, habitValue, habitParts, isDone, dayProgress, strengthToday } from "../src/utils/habits.js";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const MONDAY = "2026-10-05";
const profile = { water_goal: 8, meal_goal: 4, sleep_goal: 8 };
const goals = { fuerzaDiasSemana: 3 };

const habit = (fields) => ({ id: "h", type: "bool", target: 1, days: ALL_DAYS, archived: false, source: null, ...fields });

const emptyCtx = () => ({
  profile, goals, habitLogs: [], waterLogs: [], stepLogs: [], workouts: [], meals: [], sleeps: [], strengthSessions: [],
});

test("isApplicable respeta los días y el archivado", () => {
  assert.equal(isApplicable(habit({ days: [1] }), MONDAY), true);
  assert.equal(isApplicable(habit({ days: [2, 3] }), MONDAY), false);
  assert.equal(isApplicable(habit({ archived: true }), MONDAY), false);
});

test("habitTarget: sí/no es 1, agua sale del perfil, fuerza de los objetivos, el resto del hábito", () => {
  const ctx = emptyCtx();
  assert.equal(habitTarget(habit({ type: "bool", target: 5 }), ctx), 1);
  assert.equal(habitTarget(habit({ type: "count", target: 3, source: "water" }), ctx), 8);
  assert.equal(habitTarget(habit({ type: "count", target: 8000, source: "steps" }), ctx), 8000);
  assert.equal(habitTarget(habit({ type: "count", target: 1, source: "strength_week" }), ctx), 3);
  // Comida: dos partes (agua y comidas), cada una cumplida suma 1
  assert.equal(habitTarget(habit({ type: "count", source: "food" }), ctx), 2);
  // Descanso: horas, la meta sale del perfil (aunque el hábito viejo diga "bool")
  assert.equal(habitTarget(habit({ type: "count", source: "sleep" }), ctx), 8);
  assert.equal(habitTarget(habit({ type: "bool", source: "sleep" }), ctx), 8);
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
    { date: MONDAY, type: "cardio", duration_min: 20 },
    { date: MONDAY, type: "caminata", duration_min: 15 },
    { date: MONDAY, type: "fuerza", duration_min: 45 },
    { date: "2026-10-04", type: "cardio", duration_min: 60 },
  ];
  ctx.waterLogs = [{ date: MONDAY, glasses: 5 }];
  ctx.meals = [
    { date: MONDAY, tags: ["verdura", "integral"] },
    { date: MONDAY, tags: ["frito"] },
    { date: MONDAY, tags: ["verdura"] },
  ];
  ctx.sleeps = [{ date: MONDAY, hours: 8.5 }];

  assert.equal(habitValue(habit({ type: "count", source: "water" }), MONDAY, ctx), 5);
  assert.equal(habitValue(habit({ type: "count", source: "meal_veggies" }), MONDAY, ctx), 2);
  // Descanso: las horas dormidas; se cumple con la meta del perfil
  assert.equal(habitValue(habit({ source: "sleep" }), MONDAY, ctx), 8.5);
  assert.equal(isDone(habit({ source: "sleep" }), MONDAY, ctx), true);

  ctx.sleeps = [{ date: MONDAY, hours: 7.5 }];
  assert.equal(habitValue(habit({ source: "sleep" }), MONDAY, ctx), 7.5);
  assert.equal(isDone(habit({ source: "sleep" }), MONDAY, ctx), false);
  assert.equal(habitValue(habit({ source: "sleep" }), "2026-10-04", ctx), 0);
});

test("Ritmo: los pasos del día contra la meta", () => {
  const ctx = emptyCtx();
  ctx.stepLogs = [{ date: MONDAY, steps: 8200 }, { date: "2026-10-04", steps: 3000 }];
  const ritmo = habit({ type: "count", target: 8000, unit: "pasos", source: "steps" });
  assert.equal(habitValue(ritmo, MONDAY, ctx), 8200);
  assert.equal(isDone(ritmo, MONDAY, ctx), true);
  assert.equal(isDone(ritmo, "2026-10-04", ctx), false);
  assert.equal(habitValue(ritmo, "2026-10-03", ctx), 0);
});

test("Fuerza: días con pesas en la semana, hasta ese día", () => {
  const ctx = emptyCtx();
  // sesiones de la página Fuerza (fecha) y entrenos de tipo fuerza (date), sin contar dos veces el mismo día
  ctx.strengthSessions = [{ fecha: MONDAY }, { fecha: "2026-10-07" }, { fecha: "2026-10-04" }];
  ctx.workouts = [{ date: MONDAY, type: "fuerza", duration_min: 40 }, { date: "2026-10-09", type: "fuerza", duration_min: 40 }];
  const fuerza = habit({ type: "count", source: "strength_week" });

  assert.equal(habitValue(fuerza, MONDAY, ctx), 1);        // el domingo 4 es de la semana anterior
  assert.equal(habitValue(fuerza, "2026-10-08", ctx), 2);  // lunes y miércoles
  assert.equal(habitValue(fuerza, "2026-10-09", ctx), 3);  // + viernes
});

test("Fuerza se cumple el día que entrenás o cuando la semana ya llegó a la meta", () => {
  const ctx = emptyCtx();
  ctx.strengthSessions = [{ fecha: MONDAY }, { fecha: "2026-10-07" }, { fecha: "2026-10-09" }];
  const fuerza = habit({ type: "count", source: "strength_week" });

  assert.equal(isDone(fuerza, MONDAY, ctx), true);         // entrenó ese día
  assert.equal(isDone(fuerza, "2026-10-06", ctx), false);  // martes: descanso y 1 de 3
  assert.equal(isDone(fuerza, "2026-10-10", ctx), true);   // sábado: la semana ya tiene 3
});

test("Fuerza: el + de Hoy marca el día (habit_log) y cuenta para la semana", () => {
  const ctx = emptyCtx();
  const fuerza = habit({ id: "f", type: "count", source: "strength_week" });
  ctx.habitLogs = [{ habit_id: "f", date: MONDAY, value: 1 }, { habit_id: "otro", date: "2026-10-06", value: 1 }];
  ctx.strengthSessions = [{ fecha: "2026-10-07" }];

  assert.equal(habitValue(fuerza, "2026-10-07", ctx), 2);
  assert.equal(isDone(fuerza, MONDAY, ctx), true);
  assert.equal(isDone(fuerza, "2026-10-06", ctx), false); // el log de otro hábito no cuenta
});

test("strengthToday: si ese día ya entrenaste y si fue con el + de Hoy", () => {
  const ctx = emptyCtx();
  const fuerza = habit({ id: "f", type: "count", source: "strength_week" });
  ctx.habitLogs = [{ habit_id: "f", date: MONDAY, value: 1 }];
  ctx.strengthSessions = [{ fecha: "2026-10-07" }];

  assert.deepEqual(strengthToday(fuerza, MONDAY, ctx), { trained: true, marked: true });
  assert.deepEqual(strengthToday(fuerza, "2026-10-07", ctx), { trained: true, marked: false });
  assert.deepEqual(strengthToday(fuerza, "2026-10-06", ctx), { trained: false, marked: false });
});

test("Comida: agua y comidas del día, se cumple con las dos", () => {
  const ctx = emptyCtx();
  const comida = habit({ type: "count", source: "food" });
  ctx.waterLogs = [{ date: MONDAY, glasses: 8 }];
  ctx.meals = [{ date: MONDAY, tags: [] }, { date: MONDAY, tags: [] }, { date: MONDAY, tags: [] }];

  assert.deepEqual(habitParts(comida, MONDAY, ctx), [
    { value: 8, target: 8, unit: "vasos de agua" },
    { value: 3, target: 4, unit: "comidas" },
  ]);
  assert.equal(habitValue(comida, MONDAY, ctx), 1);
  assert.equal(isDone(comida, MONDAY, ctx), false);

  ctx.meals.push({ date: MONDAY, tags: [] });
  assert.equal(habitValue(comida, MONDAY, ctx), 2);
  assert.equal(isDone(comida, MONDAY, ctx), true);
});

test("habitParts es null para los hábitos de una sola meta", () => {
  assert.equal(habitParts(habit({ source: "sleep" }), MONDAY, emptyCtx()), null);
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
