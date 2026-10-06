/* ============================================
   Store — Strength
   ============================================ */

// Escrituras de Fuerza: rutinas, entrenamiento en curso, sesiones,
// ejercicios propios y el objetivo de días por semana.
//
// El entrenamiento en curso vive en "entreno_actual" (o null): así, si salís
// de la página o se recarga, al volver seguís donde estabas.

import { get, set, add, update, remove } from "./store.js";
import { todayKey } from "../utils/dates.js";

/* ---------------------------------------- */
/* Objetivos */
/* ---------------------------------------- */

// Pisa solo los objetivos indicados: setGoals({ fuerzaDiasSemana: 3 })
export async function setGoals(changes) {
  const goals = await get("objetivos");
  await set("objetivos", { ...goals, ...changes });
}

/* ---------------------------------------- */
/* Rutinas */
/* ---------------------------------------- */

// Crea (sin id) o edita (con id) una rutina
export async function saveRoutine(rutina) {
  if (rutina.id) {
    const { id, ...changes } = rutina;
    await update("rutina", id, changes);
  } else {
    await add("rutina", rutina);
  }
}

export async function deleteRoutine(id) {
  await remove("rutina", id);
}

// Suma o saca un día de la semana de una rutina (Plan)
export async function toggleRoutineDay(id, weekday, on) {
  const rutinas = await get("rutina");
  const rutina = rutinas.find((r) => r.id === id);
  if (!rutina) return;
  const dias = new Set(rutina.dias);
  if (on) dias.add(weekday);
  else dias.delete(weekday);
  await update("rutina", id, { dias: [...dias].sort() });
}

/* ---------------------------------------- */
/* Entrenamiento en curso */
/* ---------------------------------------- */

// workout = { rutinaId, rutina, ejercicios } (ver utils/strength.js → buildWorkout)
export async function startWorkout(workout) {
  await set("entreno_actual", { ...workout, inicio: new Date().toISOString(), descansoHasta: null, descansoTotal: 0 });
}

// Guarda el estado del entrenamiento (cada cambio de serie, peso o descanso)
export async function saveWorkout(workout) {
  await set("entreno_actual", workout);
}

export async function discardWorkout() {
  await set("entreno_actual", null);
}

// Pasa el entrenamiento en curso a una sesión guardada y lo cierra.
// Devuelve la sesión.
export async function finishWorkout() {
  const workout = await get("entreno_actual");
  if (!workout) return null;

  const minutes = Math.max(1, Math.round((Date.now() - new Date(workout.inicio).getTime()) / 60000));
  const sesion = await add("sesion_fuerza", {
    fecha: todayKey(),
    rutina: workout.rutina,
    duracionMin: minutes,
    ejercicios: workout.ejercicios.map(({ nombre, series }) => ({ nombre, series })),
  });

  await set("entreno_actual", null);
  return sesion;
}

export async function deleteSession(id) {
  await remove("sesion_fuerza", id);
}

/* ---------------------------------------- */
/* Ejercicios propios */
/* ---------------------------------------- */

export async function addCustomExercise({ nombre, grupo, equipo }) {
  await add("ejercicio", { nombre, grupo, equipo });
}
