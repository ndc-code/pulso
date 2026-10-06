/* ============================================
   Store — Store
   ============================================ */

// API única de datos de la app. Las vistas SOLO hablan con este archivo
// (o con los módulos de src/store/ que se apoyan en él).
//
//   const profile = await get("profile");
//   await set("profile", { ...profile, name: "Nico" });
//   const off = subscribe("profile", (value) => { ... });  // off() para dejar de escuchar
//
// Para colecciones (listas de filas con id) hay atajos que mapean 1:1
// a insert / update / delete de Supabase:
//   const row = await add("workout", { date, duration_min: 30 });
//   await update("workout", row.id, { note: "Buenísimo" });
//   await remove("workout", row.id);
//
// Las claves son los nombres de las entidades del modelo de datos
// (profile, habit, habit_log, workout...), para que mapeen 1:1 a tablas de Supabase.

import * as adapter from "./local.js";
import { DEFAULTS } from "./defaults.js";

// key -> Set de callbacks
const listeners = new Map();

// Devuelve el valor guardado, o el default de esa clave si no hay nada.
// Siempre devuelve una copia: modificar el objeto no cambia el store
// hasta que se llame a set().
export async function get(key) {
  const value = await adapter.read(key);
  if (value != null) return value;
  return structuredClone(DEFAULTS[key] ?? null);
}

// Guarda el valor y avisa a todos los que escuchan esa clave.
export async function set(key, value) {
  await adapter.write(key, value);
  notify(key, value);
}

// ¿Hay algo guardado en esa clave? (sin contar los defaults)
export async function has(key) {
  return (await adapter.read(key)) != null;
}

// Escucha cambios de una clave. Devuelve una función para desuscribirse,
// que las vistas llaman al desmontarse.
export function subscribe(key, callback) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key).delete(callback);
}

/* ---------------------------------------- */
/* Colecciones */
/* ---------------------------------------- */

// Agrega una fila con id nuevo y la devuelve
export async function add(key, row) {
  const rows = (await get(key)) ?? [];
  const newRow = { id: crypto.randomUUID(), ...row };
  await set(key, [...rows, newRow]);
  return newRow;
}

// Pisa solo los campos indicados de la fila con ese id
export async function update(key, id, changes) {
  const rows = (await get(key)) ?? [];
  await set(
    key,
    rows.map((row) => (row.id === id ? { ...row, ...changes } : row)),
  );
}

export async function remove(key, id) {
  const rows = (await get(key)) ?? [];
  await set(
    key,
    rows.filter((row) => row.id !== id),
  );
}

function notify(key, value) {
  listeners.get(key)?.forEach((callback) => {
    // Un callback que falla no debe frenar a los demás
    try {
      callback(structuredClone(value));
    } catch (error) {
      console.error(`[store] error en un subscriber de "${key}"`, error);
    }
  });
}
