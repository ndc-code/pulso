/* ============================================
   Utils — Streaks
   ============================================ */

// Rachas con días de gracia ("constancia sin culpa", spec 2.3).
//
// Reglas:
//   - Se cuentan los días aplicables seguidos con el hábito cumplido.
//   - Los días en que el hábito no aplica se saltean: ni suman ni cortan.
//   - Hoy, mientras no esté cumplido, tampoco corta (el día sigue abierto).
//   - Un día fallado se perdona (no suma, pero no corta) si no hubo
//     otro fallo en los 7 días anteriores. Dos fallos en una semana cortan.

import { addDays } from "./dates.js";
import { isApplicable as habitApplies, isDone as habitDone } from "./habits.js";

const GRACE_WINDOW = 7;
const LOOKBACK = 366; // no se mira más de un año para atrás

// isApplicable(key) e isDone(key) se reciben como funciones
// para que esta lógica no dependa de dónde vienen los datos
export function computeStreak({ today, isApplicable, isDone }) {
  const isMiss = (key) => isApplicable(key) && !isDone(key);

  const hadAnotherMiss = (key) => {
    for (let i = 1; i <= GRACE_WINDOW; i++) {
      if (isMiss(addDays(key, -i))) return true;
    }
    return false;
  };

  let streak = 0;

  for (let i = 0; i < LOOKBACK; i++) {
    const key = addDays(today, -i);

    if (!isApplicable(key)) continue;
    if (isDone(key)) {
      streak++;
      continue;
    }
    if (i === 0) continue;               // hoy todavía está abierto
    if (hadAnotherMiss(key)) break;      // segundo fallo en la semana: corta
    // fallo perdonado: no suma, se sigue mirando para atrás
  }

  return streak;
}

// El hábito con la racha actual más larga: { habit, days } o null si no hay ninguna
export function longestStreak(habits, today, ctx) {
  let best = null;

  for (const habit of habits) {
    if (habit.archived) continue;
    const days = computeStreak({
      today,
      isApplicable: (key) => habitApplies(habit, key),
      isDone: (key) => habitDone(habit, key, ctx),
    });
    // a igual racha gana el que está primero en la lista
    if (days > 0 && (!best || days > best.days)) best = { habit, days };
  }

  return best;
}
