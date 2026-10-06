/* ============================================
   Tests — Strength
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  weekDays,
  weekStreak,
  lastWeight,
  bestSet,
  exerciseHistory,
  routinesForDay,
  estimateMinutes,
  sessionStats,
  buildWorkout,
  weekVolume,
} from "../src/utils/strength.js";

const TODAY = "2026-10-08"; // jueves

const set = (peso, reps, hecha = true) => ({ peso, reps, hecha });
const session = (fecha, ejercicios, rutina = "A") => ({ id: `${fecha}-${rutina}`, fecha, rutina, duracionMin: 45, ejercicios });
const ex = (nombre, series) => ({ nombre, series });

test("weekDays: días distintos con sesión en la semana (lunes a domingo)", () => {
  const sesiones = [
    session("2026-10-05", []),
    session("2026-10-05", [], "B"), // mismo día: cuenta una vez
    session("2026-10-07", []),
    session("2026-10-04", []), // domingo de la semana anterior
  ];
  assert.equal(weekDays(sesiones, TODAY), 2);
});

test("weekStreak: semanas seguidas cumpliendo el objetivo", () => {
  const sesiones = [
    // semana actual (5–11 oct): 1 día, todavía no cumple pero no corta
    session("2026-10-06", []),
    // 28 sept – 4 oct: 2 días
    session("2026-09-29", []),
    session("2026-10-01", []),
    // 21–27 sept: 2 días
    session("2026-09-22", []),
    session("2026-09-25", []),
    // 14–20 sept: 1 día → corta
    session("2026-09-15", []),
  ];
  assert.equal(weekStreak(sesiones, TODAY, 2), 2);
});

test("weekStreak: la semana actual suma si ya cumplió", () => {
  const sesiones = [session("2026-10-05", []), session("2026-10-07", []), session("2026-09-30", []), session("2026-10-02", [])];
  assert.equal(weekStreak(sesiones, TODAY, 2), 2);
});

test("lastWeight: la serie más pesada hecha en la última sesión con ese ejercicio", () => {
  const sesiones = [
    session("2026-09-30", [ex("Sentadilla", [set(80, 8), set(85, 6)])]),
    session("2026-10-05", [ex("Sentadilla", [set(82.5, 8), set(90, 5, false)])]),
    session("2026-10-07", [ex("Press de banca", [set(60, 8)])]),
  ];
  assert.deepEqual(lastWeight(sesiones, "Sentadilla"), { peso: 82.5, reps: 8, fecha: "2026-10-05" });
  assert.equal(lastWeight(sesiones, "Dominadas"), null);
});

test("bestSet: la serie más pesada de todas", () => {
  const sesiones = [
    session("2026-09-30", [ex("Sentadilla", [set(85, 6)])]),
    session("2026-10-05", [ex("Sentadilla", [set(82.5, 8)])]),
  ];
  assert.deepEqual(bestSet(sesiones, "Sentadilla"), { peso: 85, reps: 6, fecha: "2026-09-30" });
});

test("exerciseHistory: sesiones con ese ejercicio, de la más nueva a la más vieja", () => {
  const sesiones = [
    session("2026-09-30", [ex("Sentadilla", [set(85, 6), set(0, 0, false)])]),
    session("2026-10-05", [ex("Sentadilla", [set(82.5, 8)])]),
    session("2026-10-06", [ex("Remo", [set(50, 10)])]),
  ];
  const history = exerciseHistory(sesiones, "Sentadilla");
  assert.equal(history.length, 2);
  assert.equal(history[0].fecha, "2026-10-05");
  assert.equal(history[1].series.length, 1); // solo las hechas
});

test("routinesForDay: rutinas de ese día de la semana", () => {
  const rutinas = [
    { id: "a", nombre: "A", dias: [1, 5], ejercicios: [] },
    { id: "b", nombre: "B", dias: [3], ejercicios: [] },
  ];
  assert.deepEqual(routinesForDay(rutinas, 1).map((r) => r.id), ["a"]);
  assert.deepEqual(routinesForDay(rutinas, 2), []);
});

test("estimateMinutes: series × (trabajo + descanso), redondeado a 5", () => {
  const rutina = { ejercicios: [{ series: 3, reps: 8, descansoSeg: 120 }, { series: 3, reps: 10, descansoSeg: 60 }] };
  // 3 × (45 + 120) + 3 × (45 + 60) = 495 + 315 = 810 s = 13,5 min → 15
  assert.equal(estimateMinutes(rutina), 15);
});

test("sessionStats: series hechas, total y volumen (peso × reps de las hechas)", () => {
  const stats = sessionStats(session(TODAY, [ex("A", [set(50, 10), set(50, 8), set(50, 8, false)]), ex("B", [set(20, 12)])]));
  assert.equal(stats.done, 3);
  assert.equal(stats.total, 4);
  assert.equal(stats.volume, 50 * 10 + 50 * 8 + 20 * 12);
});

test("weekVolume: volumen de las sesiones de la semana", () => {
  const sesiones = [session("2026-10-06", [ex("A", [set(50, 10)])]), session("2026-09-30", [ex("A", [set(100, 10)])])];
  assert.equal(weekVolume(sesiones, TODAY), 500);
});

test("buildWorkout: series de la rutina, con el último peso usado", () => {
  const rutina = { id: "a", nombre: "A", ejercicios: [{ nombre: "Sentadilla", series: 2, reps: 8, descansoSeg: 120 }, { nombre: "Nuevo", series: 1, reps: 12, descansoSeg: 60 }] };
  const sesiones = [session("2026-10-05", [ex("Sentadilla", [set(80, 8)])])];
  const workout = buildWorkout(rutina, sesiones);
  assert.equal(workout.rutina, "A");
  assert.equal(workout.ejercicios.length, 2);
  assert.deepEqual(workout.ejercicios[0].series, [set(80, 8, false), set(80, 8, false)]);
  assert.equal(workout.ejercicios[0].descansoSeg, 120);
  assert.deepEqual(workout.ejercicios[1].series, [set(0, 12, false)]);
});
