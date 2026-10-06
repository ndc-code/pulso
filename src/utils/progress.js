/* ============================================
   Utils — Progress
   ============================================ */

// Cálculos puros de Progreso (spec 4.5): el resumen de la semana
// y el calendario de constancia. No leen ni guardan nada.
// Reciben el mismo contexto que utils/habits.js (store/habits.js → loadHabitContext).

import { addDays, startOfWeek, weekKeys } from "./dates.js";
import { dayProgress } from "./habits.js";
import { dayScore } from "./meals.js";
import { sleepSummary } from "./sleep.js";

// Nivel de un día según los hábitos cumplidos:
//   "good" todos · "mid" la mitad o más · "low" alguno · "none" ninguno
export function dayLevel({ done, total }) {
  if (total === 0 || done === 0) return "none";
  if (done === total) return "good";
  if (done / total >= 0.5) return "mid";
  return "low";
}

// Resumen de la semana de `today` (lunes a hoy):
//   habits         { done, total, percent } sumando todos los días que pasaron
//   minutes        minutos activos
//   goodFoodDays   días "buenos" en Comer · foodDays días con comidas
//   sleepAverage   promedio de horas (null sin noches) · sleepNights noches
export function weeklyReport(ctx, today) {
  const days = weekKeys(today).filter((key) => key <= today);
  const monday = startOfWeek(today);
  const inWeek = (row) => row.date >= monday && row.date <= today;

  let done = 0;
  let total = 0;
  for (const key of days) {
    const progress = dayProgress(ctx.habits, key, ctx);
    done += progress.done;
    total += progress.total;
  }

  const levels = days.map((key) => dayScore(ctx.meals, key).level);
  const sleep = sleepSummary(ctx.sleeps, today, ctx.profile.sleep_goal);

  return {
    habits: { done, total, percent: total ? Math.round((done / total) * 100) : 0 },
    minutes: ctx.workouts.filter(inWeek).reduce((sum, w) => sum + w.duration_min, 0),
    goodFoodDays: levels.filter((level) => level === "good").length,
    foodDays: levels.filter((level) => level !== "none").length,
    sleepAverage: sleep.average,
    sleepNights: sleep.nights,
  };
}

// Calendario de constancia: `weeks` columnas (de la semana más vieja a la actual),
// cada una de lunes a domingo, con el nivel de cada día.
export function consistencyGrid(habits, today, ctx, weeks = 26) {
  const firstMonday = addDays(startOfWeek(today), -7 * (weeks - 1));

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(firstMonday, w * 7 + d);
      const isFuture = key > today;
      return {
        key,
        level: isFuture ? "none" : dayLevel(dayProgress(habits, key, ctx)),
        isToday: key === today,
        isFuture,
      };
    }),
  );
}
