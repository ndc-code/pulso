/* ============================================
   Utils — Habits
   ============================================ */

// Cálculos puros sobre hábitos: no leen ni guardan nada.
// Reciben un "contexto" con los datos ya cargados:
//   { profile, habitLogs, waterLogs, workouts, meals, sleeps }
//
// Un hábito puede tener `source`: de dónde sale su valor.
//   null               manual, se guarda en habit_log
//   "workout_minutes"  suma de minutos de los entrenos del día
//   "water"            vasos de water_log (la meta sale de profile.water_goal)
//   "meal_veggies"     comidas del día con el chip "verdura"
//   "sleep"            1 si durmió al menos profile.sleep_goal horas
//   "breathing"        manual; además lo marca la respiración guiada

import { weekdayOf, weekKeys, fromDateKey } from "./dates.js";

export function isApplicable(habit, dateKey) {
  return !habit.archived && habit.days.includes(weekdayOf(dateKey));
}

export function habitTarget(habit, profile) {
  if (habit.type === "bool") return 1;
  if (habit.source === "water") return profile.water_goal;
  return habit.target;
}

export function habitValue(habit, dateKey, ctx) {
  const onDay = (row) => row.date === dateKey;

  switch (habit.source) {
    case "workout_minutes":
      return ctx.workouts.filter(onDay).reduce((sum, w) => sum + w.duration_min, 0);

    case "water":
      return ctx.waterLogs.find(onDay)?.glasses ?? 0;

    case "meal_veggies":
      return ctx.meals.filter((m) => onDay(m) && m.tags.includes("verdura")).length;

    case "sleep": {
      const sleep = ctx.sleeps.find(onDay);
      return sleep && sleep.hours >= ctx.profile.sleep_goal ? 1 : 0;
    }

    default:
      return ctx.habitLogs.find((log) => log.habit_id === habit.id && onDay(log))?.value ?? 0;
  }
}

export function isDone(habit, dateKey, ctx) {
  return habitValue(habit, dateKey, ctx) >= habitTarget(habit, ctx.profile);
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
