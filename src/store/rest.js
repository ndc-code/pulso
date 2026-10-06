/* ============================================
   Store — Rest
   ============================================ */

// Escrituras de Descanso: sueño, ánimo y respiración.
// Sueño y ánimo guardan un registro por día: si ya hay uno, se pisa.

import { get, add, update, remove } from "./store.js";
import { setManualValue } from "./habits.js";
import { bedTimeFor, lastTimes } from "../utils/sleep.js";

// Guarda la noche del día `date` (el día en que te despertaste)
export async function saveSleep({ date, bed_time, wake_time, hours, quality }) {
  const sleeps = await get("sleep");
  const existing = sleeps.find((row) => row.date === date);
  const data = { date, bed_time, wake_time, hours, quality };

  if (existing) await update("sleep", existing.id, data);
  else await add("sleep", data);
}

// Horas de sueño desde el − / + de Descanso en Hoy (sin horarios).
// La hora de despertar se mantiene (la de esa noche, o la de la última
// registrada) y la de acostarse se calcula. Con 0 horas se borra la noche.
export async function setSleepHours(date, hours) {
  const sleeps = await get("sleep");
  const existing = sleeps.find((row) => row.date === date);

  if (hours <= 0) {
    if (existing) await remove("sleep", existing.id);
    return;
  }

  const wake = existing?.wake_time ?? lastTimes(sleeps).wake;
  const data = { bed_time: bedTimeFor(wake, hours), wake_time: wake, hours };
  if (existing) await update("sleep", existing.id, data);
  else await add("sleep", { date, quality: null, ...data });
}

// Check-in de ánimo y energía. `changes` puede traer uno solo de los dos.
export async function saveMood(date, changes) {
  const moods = await get("mood");
  const existing = moods.find((row) => row.date === date);

  if (existing) await update("mood", existing.id, changes);
  else await add("mood", { date, mood: null, energy: null, ...changes });
}

// Al terminar una respiración guiada se marca el hábito "Pausa / respiración".
// Devuelve false si ese hábito no existe o está archivado.
export async function markBreathing(date) {
  const habits = (await get("habit")) ?? [];
  const habit = habits.find((h) => h.source === "breathing" && !h.archived);
  if (!habit) return false;
  await setManualValue(habit.id, date, 1);
  return true;
}
