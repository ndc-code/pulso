/* ============================================
   Tests — Sleep
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sleepHours,
  formatHours,
  hoursClock,
  weekSleep,
  sleepSummary,
  lastTimes,
  breathingStep,
  BREATHING_PATTERNS,
} from "../src/utils/sleep.js";

const DAY = "2026-10-08"; // jueves
const night = (date, hours, quality = 3) => ({ id: date, date, bed_time: "23:00", wake_time: "07:00", hours, quality });

test("sleepHours: cruza la medianoche", () => {
  assert.equal(sleepHours("23:30", "07:15"), 7.75);
});

test("sleepHours: sin cruzar la medianoche (siesta o dormir tarde)", () => {
  assert.equal(sleepHours("01:00", "08:30"), 7.5);
});

test("sleepHours: misma hora es 0", () => {
  assert.equal(sleepHours("07:00", "07:00"), 0);
});

test("sleepHours: hora inválida devuelve null", () => {
  assert.equal(sleepHours("", "07:00"), null);
  assert.equal(sleepHours("25:00", "07:00"), null);
});

test("formatHours: horas y minutos", () => {
  assert.equal(formatHours(7.75), "7 h 45");
  assert.equal(formatHours(8), "8 h");
  assert.equal(formatHours(6.5), "6 h 30");
  assert.equal(formatHours(0.25), "0 h 15");
});

test("formatHours: redondea al minuto", () => {
  assert.equal(formatHours(7.999), "8 h");
});

test("hoursClock: formato reloj para el número grande", () => {
  assert.equal(hoursClock(7.75), "7:45");
  assert.equal(hoursClock(8), "8:00");
  assert.equal(hoursClock(6.05), "6:03");
});

test("weekSleep: lunes a domingo, con null en las noches sin registro", () => {
  const week = weekSleep([night("2026-10-06", 7), night("2026-10-08", 6.5)], DAY);
  assert.equal(week.length, 7);
  assert.equal(week[0].key, "2026-10-05");
  assert.equal(week[0].hours, null);
  assert.equal(week[1].hours, 7);
  assert.equal(week[3].hours, 6.5);
  assert.equal(week[3].isToday, true);
  assert.equal(week[4].isFuture, true);
});

test("sleepSummary: promedio solo de las noches registradas de la semana", () => {
  const sleeps = [night("2026-10-06", 7, 4), night("2026-10-07", 6, 2), night("2026-09-30", 9)];
  const summary = sleepSummary(sleeps, DAY, 7);
  assert.equal(summary.nights, 2);
  assert.equal(summary.average, 6.5);
  assert.equal(summary.onGoal, 1);
  assert.equal(summary.quality, 3);
});

test("sleepSummary: sin noches no hay promedio", () => {
  const summary = sleepSummary([], DAY, 7);
  assert.equal(summary.nights, 0);
  assert.equal(summary.average, null);
  assert.equal(summary.quality, null);
});

test("lastTimes: horarios del registro más reciente", () => {
  const sleeps = [
    { date: "2026-10-06", bed_time: "23:00", wake_time: "07:00" },
    { date: "2026-10-07", bed_time: "00:15", wake_time: "08:00" },
  ];
  assert.deepEqual(lastTimes(sleeps), { bed: "00:15", wake: "08:00" });
});

test("lastTimes: sin registros, 23:00 a 07:00", () => {
  assert.deepEqual(lastTimes([]), { bed: "23:00", wake: "07:00" });
});

test("breathingStep: 4-4-4-4 recorre inhalá, sostené, exhalá, sostené", () => {
  const box = BREATHING_PATTERNS.find((p) => p.value === "box");
  assert.equal(breathingStep(box, 0).phase.kind, "in");
  assert.equal(breathingStep(box, 0).secondsLeft, 4);
  assert.equal(breathingStep(box, 4).phase.kind, "hold");
  assert.equal(breathingStep(box, 9.5).phase.kind, "out");
  assert.equal(breathingStep(box, 9.5).secondsLeft, 3);
  assert.equal(breathingStep(box, 12).phaseIndex, 3);
});

test("breathingStep: vuelve a empezar y cuenta los ciclos", () => {
  const box = BREATHING_PATTERNS.find((p) => p.value === "box");
  const step = breathingStep(box, 17);
  assert.equal(step.cycle, 1);
  assert.equal(step.phaseIndex, 0);
  assert.equal(step.secondsLeft, 3);
});

test("breathingStep: 4-7-8 sostiene 7 y exhala 8", () => {
  const p478 = BREATHING_PATTERNS.find((p) => p.value === "478");
  assert.equal(breathingStep(p478, 5).phase.kind, "hold");
  assert.equal(breathingStep(p478, 11).phase.kind, "out");
  assert.equal(breathingStep(p478, 11).secondsLeft, 8);
  assert.equal(breathingStep(p478, 19).cycle, 1);
});
