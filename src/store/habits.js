/* ============================================
   Store — Habits
   ============================================ */

// Lectura y escritura de hábitos y sus registros.
// Las vistas usan estas funciones en vez de armar las operaciones a mano.

import { get, set, add, update, remove } from "./store.js";
import { sortByOrder } from "../utils/habits.js";

// Todas las claves que afectan el estado de un hábito en un día.
// Las vistas de hábitos se suscriben a estas para refrescarse.
export const HABIT_KEYS = ["profile", "habit", "habit_log", "water_log", "workout", "meal", "sleep"];

// Carga todo lo necesario para calcular hábitos (ver utils/habits.js)
export async function loadHabitContext() {
  const [profile, habits, habitLogs, waterLogs, workouts, meals, sleeps] = await Promise.all(
    HABIT_KEYS.map((key) => get(key)),
  );
  return { profile, habits: habits ?? [], habitLogs, waterLogs, workouts, meals, sleeps };
}

/* ---------------------------------------- */
/* Registros del día */
/* ---------------------------------------- */

// Valor de un hábito manual en un día. Con 0 se borra el registro.
export async function setManualValue(habitId, date, value) {
  const logs = await get("habit_log");
  const log = logs.find((row) => row.habit_id === habitId && row.date === date);

  if (value <= 0) {
    if (log) await remove("habit_log", log.id);
  } else if (log) {
    await update("habit_log", log.id, { value });
  } else {
    await add("habit_log", { habit_id: habitId, date, value });
  }
}

// Vasos de agua de un día (spec: water_log = { date, glasses }).
// Además guarda `last_at` (fecha y hora del último vaso sumado),
// para mostrar "Último: 14:20" en Comer.
export async function setWaterGlasses(date, glasses) {
  const logs = await get("water_log");
  const log = logs.find((row) => row.date === date);
  const added = glasses > (log?.glasses ?? 0);
  const lastAt = added ? new Date().toISOString() : log?.last_at ?? null;

  if (glasses <= 0) {
    if (log) await remove("water_log", log.id);
  } else if (log) {
    await update("water_log", log.id, { glasses, last_at: lastAt });
  } else {
    await add("water_log", { date, glasses, last_at: lastAt });
  }
}

/* ---------------------------------------- */
/* Gestión de hábitos */
/* ---------------------------------------- */

// Crea (sin id) o edita (con id) un hábito
export async function saveHabit(habit) {
  if (habit.id) {
    const { id, ...changes } = habit;
    await update("habit", id, changes);
    return;
  }

  const habits = (await get("habit")) ?? [];
  const order = habits.reduce((max, h) => Math.max(max, h.order), -1) + 1;
  await add("habit", { source: null, archived: false, ...habit, order });
}

export async function setArchived(id, archived) {
  await update("habit", id, { archived });
}

// Sube (-1) o baja (+1) un hábito activo un lugar en la lista
export async function moveHabit(id, direction) {
  const habits = (await get("habit")) ?? [];
  const active = sortByOrder(habits.filter((h) => !h.archived));
  const index = active.findIndex((h) => h.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= active.length) return;

  // Se intercambian de lugar y se renumera todo de 0 en adelante
  [active[index], active[target]] = [active[target], active[index]];
  const newOrder = new Map(active.map((h, i) => [h.id, i]));

  await set(
    "habit",
    habits.map((h) => (newOrder.has(h.id) ? { ...h, order: newOrder.get(h.id) } : h)),
  );
}
