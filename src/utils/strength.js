/* ============================================
   Utils — Strength
   ============================================ */

// Cálculos puros de Fuerza (pesas). No leen ni guardan nada.
//
//   sesión: { id, fecha, rutina, duracionMin, ejercicios: [{ nombre, series: [{ peso, reps, hecha }] }] }
//   rutina: { id, nombre, dias: [1, 5], ejercicios: [{ nombre, series, reps, descansoSeg }] }
//           (dias: 0 = domingo … 6 = sábado, como en utils/dates.js)
//
// Solo cuentan las series con `hecha: true`.

import { startOfWeek, addDays } from "./dates.js";

const WORK_SECONDS = 45; // lo que dura una serie, más o menos (para estimar la duración)

const byDate = (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
const doneSets = (exercise) => exercise.series.filter((s) => s.hecha);

// Días distintos con al menos una sesión en la semana de `day`
export function weekDays(sesiones, day) {
  const monday = startOfWeek(day);
  const sunday = addDays(monday, 6);
  return new Set(sesiones.filter((s) => s.fecha >= monday && s.fecha <= sunday).map((s) => s.fecha)).size;
}

// Semanas seguidas cumpliendo el objetivo de días.
// La semana actual suma si ya se cumplió; si todavía no, no corta (sigue abierta).
export function weekStreak(sesiones, today, goalDays) {
  let streak = weekDays(sesiones, today) >= goalDays ? 1 : 0;
  let monday = addDays(startOfWeek(today), -7);

  for (let i = 0; i < 104; i++) {
    if (weekDays(sesiones, monday) < goalDays) break;
    streak++;
    monday = addDays(monday, -7);
  }
  return streak;
}

// Sesiones con ese ejercicio (y al menos una serie hecha), de la más nueva a la más vieja.
// Cada una: { fecha, rutina, series } con solo las series hechas.
export function exerciseHistory(sesiones, nombre) {
  return [...sesiones]
    .sort(byDate)
    .reverse()
    .map((s) => {
      const exercise = s.ejercicios.find((e) => e.nombre === nombre);
      return exercise ? { fecha: s.fecha, rutina: s.rutina, series: doneSets(exercise) } : null;
    })
    .filter((entry) => entry && entry.series.length);
}

// La serie más pesada de una lista: { peso, reps }
function heaviest(series) {
  return series.reduce((best, s) => (!best || s.peso > best.peso ? s : best), null);
}

// Último peso usado: la serie más pesada de la última sesión con ese ejercicio
export function lastWeight(sesiones, nombre) {
  const last = exerciseHistory(sesiones, nombre)[0];
  if (!last) return null;
  const top = heaviest(last.series);
  return { peso: top.peso, reps: top.reps, fecha: last.fecha };
}

// Mejor marca: la serie más pesada de todas las sesiones
export function bestSet(sesiones, nombre) {
  let best = null;
  for (const entry of exerciseHistory(sesiones, nombre)) {
    const top = heaviest(entry.series);
    if (!best || top.peso > best.peso) best = { peso: top.peso, reps: top.reps, fecha: entry.fecha };
  }
  return best;
}

export function routinesForDay(rutinas, weekday) {
  return rutinas.filter((r) => r.dias.includes(weekday));
}

// Duración estimada de una rutina, en minutos redondeados a 5
export function estimateMinutes(rutina) {
  const seconds = rutina.ejercicios.reduce((sum, e) => sum + e.series * (WORK_SECONDS + e.descansoSeg), 0);
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

// Series hechas, total de series y volumen (Σ peso × reps de las hechas)
export function sessionStats(sesion) {
  const all = sesion.ejercicios.flatMap((e) => e.series);
  const done = all.filter((s) => s.hecha);
  return {
    done: done.length,
    total: all.length,
    volume: done.reduce((sum, s) => sum + s.peso * s.reps, 0),
  };
}

// Volumen de todas las sesiones de la semana de `day`
export function weekVolume(sesiones, day) {
  const monday = startOfWeek(day);
  const sunday = addDays(monday, 6);
  return sesiones
    .filter((s) => s.fecha >= monday && s.fecha <= sunday)
    .reduce((sum, s) => sum + sessionStats(s).volume, 0);
}

// Arma el entrenamiento en curso a partir de una rutina:
// las series de la rutina, con el último peso usado en cada ejercicio (0 si es nuevo).
export function buildWorkout(rutina, sesiones) {
  return {
    rutinaId: rutina.id ?? null,
    rutina: rutina.nombre,
    ejercicios: rutina.ejercicios.map((e) => newExercise(e, sesiones)),
  };
}

// Un ejercicio listo para entrenar: { nombre, descansoSeg, series: [{ peso, reps, hecha }] }
export function newExercise({ nombre, series = 3, reps = 10, descansoSeg = 90 }, sesiones) {
  const peso = lastWeight(sesiones, nombre)?.peso ?? 0;
  return {
    nombre,
    descansoSeg,
    series: Array.from({ length: series }, () => ({ peso, reps, hecha: false })),
  };
}
