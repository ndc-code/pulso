/* ============================================
   Utils — Habits
   ============================================ */

// Cálculos puros sobre hábitos: no leen ni guardan nada.
// Reciben un "contexto" con los datos ya cargados:
//   { profile, goals, habitLogs, waterLogs, stepLogs, workouts, meals, sleeps, strengthSessions }
//
// Un hábito puede tener `source`: de dónde sale su valor.
//   null               manual, se guarda en habit_log
//   "steps"            pasos del día de steps_log (Ritmo)
//   "strength_week"    días con pesas en la semana, hasta ese día (Fuerza):
//                      sesiones de la página Fuerza, entrenos de tipo fuerza y
//                      los días marcados con el + de Hoy (habit_log del hábito).
//                      La meta es goals.fuerzaDiasSemana. Se cumple el día que
//                      entrenás o cuando la semana ya llegó a la meta.
//   "food"             dos partes: vasos de agua y comidas registradas (Comida).
//                      Metas: profile.water_goal y profile.meal_goal. Vale 0, 1 o 2
//                      según cuántas partes se cumplieron; ver habitParts().
//   "water"            vasos de water_log (la meta sale de profile.water_goal)
//   "meal_veggies"     comidas del día con el chip "verdura"
//   "sleep"            horas dormidas esa noche (Descanso); meta: profile.sleep_goal
//   "breathing"        manual; además lo marca la respiración guiada

import { weekdayOf, weekKeys, fromDateKey, startOfWeek } from "./dates.js";

export function isApplicable(habit, dateKey) {
  return !habit.archived && habit.days.includes(weekdayOf(dateKey));
}

export function habitTarget(habit, ctx) {
  // primero los que tienen meta propia: Descanso era "bool" en versiones viejas
  if (habit.source === "sleep") return ctx.profile.sleep_goal;
  if (habit.type === "bool") return 1;
  if (habit.source === "water") return ctx.profile.water_goal;
  if (habit.source === "strength_week") return ctx.goals.fuerzaDiasSemana;
  if (habit.source === "food") return 2; // las dos partes
  return habit.target;
}

// Hábitos con más de una meta (Comida): cada parte con su valor y su meta.
// null para los demás.
export function habitParts(habit, dateKey, ctx) {
  if (habit.source !== "food") return null;
  const onDay = (row) => row.date === dateKey;
  return [
    { value: ctx.waterLogs.find(onDay)?.glasses ?? 0, target: ctx.profile.water_goal, unit: "vasos de agua" },
    { value: ctx.meals.filter(onDay).length, target: ctx.profile.meal_goal, unit: "comidas" },
  ];
}

// Días con pesas: las sesiones de la página Fuerza, los entrenos de tipo
// fuerza cargados en Ritmo y los días marcados con el + de Hoy.
// Un Set, así un día cuenta una vez.
function strengthDays(habit, ctx) {
  return new Set([
    ...ctx.strengthSessions.map((s) => s.fecha),
    ...ctx.workouts.filter((w) => w.type === "fuerza").map((w) => w.date),
    ...ctx.habitLogs.filter((log) => log.habit_id === habit.id && log.value > 0).map((log) => log.date),
  ]);
}

// Para el − / + de Fuerza en Hoy: ¿ese día ya entrenaste?, ¿y fue con el + de Hoy?
// (solo lo marcado con el + se puede deshacer con el −)
export function strengthToday(habit, dateKey, ctx) {
  const marked = ctx.habitLogs.some((log) => log.habit_id === habit.id && log.date === dateKey && log.value > 0);
  return { trained: strengthDays(habit, ctx).has(dateKey), marked };
}

export function habitValue(habit, dateKey, ctx) {
  const onDay = (row) => row.date === dateKey;

  switch (habit.source) {
    case "steps":
      return ctx.stepLogs.find(onDay)?.steps ?? 0;

    case "strength_week": {
      // de lunes hasta ese día (las claves "AAAA-MM-DD" se comparan como texto)
      const monday = startOfWeek(dateKey);
      return [...strengthDays(habit, ctx)].filter((day) => day >= monday && day <= dateKey).length;
    }

    case "food":
      return habitParts(habit, dateKey, ctx).filter((part) => part.value >= part.target).length;

    case "water":
      return ctx.waterLogs.find(onDay)?.glasses ?? 0;

    case "meal_veggies":
      return ctx.meals.filter((m) => onDay(m) && m.tags.includes("verdura")).length;

    case "sleep":
      return ctx.sleeps.find(onDay)?.hours ?? 0;

    default:
      return ctx.habitLogs.find((log) => log.habit_id === habit.id && onDay(log))?.value ?? 0;
  }
}

export function isDone(habit, dateKey, ctx) {
  // Fuerza: el día que entrenás está cumplido; los demás, solo si la semana ya llegó a la meta
  if (habit.source === "strength_week" && strengthDays(habit, ctx).has(dateKey)) return true;
  return habitValue(habit, dateKey, ctx) >= habitTarget(habit, ctx);
}

// Progreso del día para el anillo: { done, total, percent }
export function dayProgress(habits, dateKey, ctx) {
  const applicable = habits.filter((habit) => isApplicable(habit, dateKey));
  const done = applicable.filter((habit) => isDone(habit, dateKey, ctx)).length;
  const total = applicable.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

// La semana de esa fecha, lunes a domingo, para la tira de Hoy.
// level: "full" (todo cumplido), "partial" (algo), "none" (nada, o día futuro)
export function weekProgress(habits, today, ctx) {
  return weekKeys(today).map((key) => {
    const isFuture = key > today; // las claves "AAAA-MM-DD" se comparan como texto
    const { done, total } = dayProgress(habits, key, ctx);

    let level = "none";
    if (!isFuture && total > 0 && done === total) level = "full";
    else if (!isFuture && done > 0) level = "partial";

    return {
      key,
      weekday: weekdayOf(key),
      dayNumber: fromDateKey(key).getDate(),
      isToday: key === today,
      isFuture,
      done,
      total,
      level,
    };
  });
}

export function sortByOrder(habits) {
  return [...habits].sort((a, b) => a.order - b.order);
}
