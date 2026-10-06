/* ============================================
   Utils — Workouts
   ============================================ */

// Cálculos puros sobre entrenos (spec 4.2). No leen ni guardan nada.
// Un entreno: { id, date, type, duration_min, intensity, routine_id, note }

import { addDays, startOfWeek, weekKeys, weekdayOf, fromDateKey } from "./dates.js";

// Tipos e intensidades: valor guardado → texto e ícono
export const WORKOUT_TYPES = [
  { value: "fuerza", label: "Fuerza", icon: "dumbbell" },
  { value: "cardio", label: "Cardio", icon: "heart" },
  { value: "caminata", label: "Caminata", icon: "footprints" },
  { value: "movilidad", label: "Movilidad", icon: "wind" },
  { value: "deporte", label: "Deporte", icon: "bike" },
  { value: "otro", label: "Otro", icon: "sun" },
];

export const INTENSITIES = [
  { value: "suave", label: "Suave" },
  { value: "media", label: "Media" },
  { value: "intensa", label: "Intensa" },
];

export const typeOf = (value) => WORKOUT_TYPES.find((t) => t.value === value) ?? WORKOUT_TYPES.at(-1);
export const intensityLabel = (value) => INTENSITIES.find((i) => i.value === value)?.label ?? "";

const sumMinutes = (list) => list.reduce((sum, w) => sum + w.duration_min, 0);

// Resumen de la semana de `day` (lunes a domingo) contra la meta semanal.
// `today` sirve para el promedio: en la semana actual se divide por los días
// que ya pasaron; en una semana anterior, por los 7.
export function weekSummary(workouts, day, weeklyGoal, today = day) {
  const monday = startOfWeek(day);
  const sunday = addDays(monday, 6);
  const inWeek = workouts.filter((w) => w.date >= monday && w.date <= sunday);

  const minutes = sumMinutes(inWeek);
  const elapsedDays = sunday < today ? 7 : ((weekdayOf(today) + 6) % 7) + 1;

  return {
    minutes,
    sessions: inWeek.length,
    activeDays: new Set(inWeek.map((w) => w.date)).size,
    remaining: Math.max(0, weeklyGoal - minutes),
    percent: weeklyGoal > 0 ? Math.min(100, Math.round((minutes / weeklyGoal) * 100)) : 0,
    dailyAverage: Math.round(minutes / elapsedDays),
  };
}

// Minutos de cada día de la semana, lunes a domingo (para las barras)
export function minutesByDay(workouts, today) {
  return weekKeys(today).map((key) => ({
    key,
    weekday: weekdayOf(key),
    dayNumber: fromDateKey(key).getDate(),
    minutes: sumMinutes(workouts.filter((w) => w.date === key)),
    isToday: key === today,
    isFuture: key > today,
  }));
}

// Historial: semanas de la más nueva a la más vieja, cada una con sus entrenos
// de la más nueva a la más vieja
export function groupByWeek(workouts) {
  const weeks = new Map();

  for (const workout of workouts) {
    const weekStart = startOfWeek(workout.date);
    if (!weeks.has(weekStart)) weeks.set(weekStart, []);
    weeks.get(weekStart).push(workout);
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([weekStart, list]) => ({
      weekStart,
      minutes: sumMinutes(list),
      // sort es estable: a igual fecha queda el orden en que se cargaron
      workouts: [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    }));
}

// Grilla de actividad para el calendario de puntos: `weeks` columnas
// (de la semana más vieja a la actual), cada una lunes a domingo.
export function activityGrid(workouts, today, weeks = 12) {
  const activeDays = new Set(workouts.map((w) => w.date));
  const firstMonday = addDays(startOfWeek(today), -7 * (weeks - 1));

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(firstMonday, w * 7 + d);
      return {
        key,
        active: activeDays.has(key),
        isToday: key === today,
        isFuture: key > today,
      };
    }),
  );
}
