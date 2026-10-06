/* ============================================
   Utils — Sleep
   ============================================ */

// Cálculos puros de Descanso (spec 4.4). No leen ni guardan nada.
// Una noche: { id, date, bed_time: "23:30", wake_time: "07:15", hours, quality }
//
// `date` es el día en que te despertaste: así "anoche" es el registro de hoy
// y el hábito Descanso de hoy sale de ese registro.

import { weekKeys, weekdayOf, fromDateKey, startOfWeek, addDays } from "./dates.js";

export const QUALITY_LABELS = {
  1: "Muy mala",
  2: "Mala",
  3: "Normal",
  4: "Buena",
  5: "Muy buena",
};

// Check-in de ánimo y energía (1 a 5), opcional
export const MOOD_LABELS = { 1: "Muy bajo", 2: "Bajo", 3: "Normal", 4: "Bien", 5: "Muy bien" };

// "07:15" → 435 (minutos desde la medianoche), o null si no es una hora válida
function toMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
  if (!match) return null;
  const [h, m] = [Number(match[1]), Number(match[2])];
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

// Horas dormidas entre dos horas del reloj.
// Si la de despertar es menor, la noche cruzó la medianoche (23:30 → 07:15).
export function sleepHours(bedTime, wakeTime) {
  const bed = toMinutes(bedTime);
  const wake = toMinutes(wakeTime);
  if (bed === null || wake === null) return null;

  const minutes = (wake - bed + 24 * 60) % (24 * 60);
  return Math.round((minutes / 60) * 100) / 100;
}

// Hora de acostarse para haber dormido `hours` hasta `wakeTime`.
// La usa el − / + de Descanso en Hoy, que carga horas y no horarios.
//   bedTimeFor("07:00", 8) → "23:00"
export function bedTimeFor(wakeTime, hours) {
  const minutes = (toMinutes(wakeTime) - Math.round(hours * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// El − / + de Descanso en Hoy: de a media hora, entre 0 y 14 h.
// Sin registro (0), el primer + pone la meta: la mayoría de las noches
// quedan cerca, y de ahí se ajusta.
const SLEEP_STEP = 0.5;
const SLEEP_MAX = 14;

export function nextSleepHours(current, direction, goal) {
  if (current === 0 && direction > 0) return goal;
  return Math.min(SLEEP_MAX, Math.max(0, current + direction * SLEEP_STEP));
}

// 7.75 → "7 h 45" · 8 → "8 h"
export function formatHours(hours) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

// 7.75 → "7:45" (para el número grande, con "h" al lado)
export function hoursClock(hours) {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Las 7 noches de la semana de `day`, lunes a domingo (hours: null si no hay registro)
export function weekSleep(sleeps, day, today = day) {
  return weekKeys(day).map((key) => ({
    key,
    weekday: weekdayOf(key),
    dayNumber: fromDateKey(key).getDate(),
    hours: sleeps.find((s) => s.date === key)?.hours ?? null,
    isToday: key === today,
    isFuture: key > today,
  }));
}

// Resumen de la semana de `day`: promedio, noches registradas,
// noches con la meta cumplida y calidad promedio
export function sleepSummary(sleeps, day, goal) {
  const monday = startOfWeek(day);
  const sunday = addDays(monday, 6);
  const inWeek = sleeps.filter((s) => s.date >= monday && s.date <= sunday);
  const average = (list) => (list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 100) / 100 : null);

  return {
    nights: inWeek.length,
    average: average(inWeek.map((s) => s.hours)),
    onGoal: inWeek.filter((s) => s.hours >= goal).length,
    quality: average(inWeek.map((s) => s.quality).filter(Boolean)),
  };
}

// Horarios para precargar el formulario: los de la última noche registrada
export function lastTimes(sleeps) {
  const last = [...sleeps].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  return { bed: last?.bed_time ?? "23:00", wake: last?.wake_time ?? "07:00" };
}

/* ---------------------------------------- */
/* Respiración guiada */
/* ---------------------------------------- */

// kind: "in" el círculo crece · "out" se achica · "hold" queda quieto
export const BREATHING_PATTERNS = [
  {
    value: "box",
    label: "4-4-4-4",
    name: "Respiración cuadrada",
    phases: [
      { kind: "in", label: "Inhalá", seconds: 4 },
      { kind: "hold", label: "Sostené", seconds: 4 },
      { kind: "out", label: "Exhalá", seconds: 4 },
      { kind: "hold", label: "Sostené", seconds: 4 },
    ],
  },
  {
    value: "478",
    label: "4-7-8",
    name: "Respiración 4-7-8",
    phases: [
      { kind: "in", label: "Inhalá", seconds: 4 },
      { kind: "hold", label: "Sostené", seconds: 7 },
      { kind: "out", label: "Exhalá", seconds: 8 },
    ],
  },
];

// En qué fase está la respiración a los `elapsed` segundos de empezar.
// secondsLeft es la cuenta regresiva que se muestra (4, 3, 2, 1).
export function breathingStep(pattern, elapsed) {
  const cycleLength = pattern.phases.reduce((sum, p) => sum + p.seconds, 0);
  const cycle = Math.floor(elapsed / cycleLength);
  let t = elapsed - cycle * cycleLength;

  for (let i = 0; i < pattern.phases.length; i++) {
    const phase = pattern.phases[i];
    if (t < phase.seconds) {
      return { phase, phaseIndex: i, cycle, secondsLeft: Math.ceil(phase.seconds - t) };
    }
    t -= phase.seconds;
  }

  // no debería llegar acá (t siempre es menor que el ciclo), por las dudas:
  return { phase: pattern.phases[0], phaseIndex: 0, cycle: cycle + 1, secondsLeft: pattern.phases[0].seconds };
}
