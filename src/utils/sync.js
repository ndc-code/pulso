/* ============================================
   Utils — Sync
   ============================================ */

// Lógica pura de la sincronización con Supabase (sin red ni storage):
// qué cambió, qué subir, cómo unir lo que baja. La usa store/sync.js.
//
// Una "entrada" de la cola de pendientes es:
//   { table: "habit", id: "<id de la fila>", op: "upsert", row: {...} }
//   { table: "habit", id: "<id de la fila>", op: "delete" }
//   { table: "user_doc", id: "profile", op: "upsert", value: {...} }

// Claves del store que son listas de filas → una tabla cada una
export const COLLECTION_KEYS = [
  "habit", "habit_log", "water_log", "steps_log", "workout", "meal", "sleep",
  "mood", "lab_result", "body", "rutina", "sesion_fuerza", "ejercicio",
];

// Claves del store que son un solo objeto → filas de la tabla user_doc
export const DOC_KEYS = ["profile", "objetivos", "lab_range", "entreno_actual"];

/* ---------------------------------------- */
/* Subida */
/* ---------------------------------------- */

// Compara dos versiones de una lista por id.
// Las filas se comparan como JSON: si una igual quedó con las claves en otro
// orden se sube de más, que no rompe nada.
export function diffRows(prev, next) {
  const before = new Map((prev ?? []).map((row) => [row.id, row]));
  const after = new Map((next ?? []).map((row) => [row.id, row]));

  const upserts = [...after.values()].filter(
    (row) => !before.has(row.id) || JSON.stringify(before.get(row.id)) !== JSON.stringify(row),
  );
  const deletes = [...before.keys()].filter((id) => !after.has(id));
  return { upserts, deletes };
}

// Fila de la app → columnas de la tabla. `date` sirve para filtrar por día
// (Fuerza la llama `fecha`); el resto va entero en `data`.
export function toRemoteRow(row) {
  return { id: row.id, date: row.date ?? row.fecha ?? null, data: row };
}

// Lo que hay que anotar en la cola cuando el store guarda `next` en `key`
export function outboxEntriesFor(key, prev, next) {
  if (DOC_KEYS.includes(key)) {
    if (JSON.stringify(prev) === JSON.stringify(next)) return [];
    return [{ table: "user_doc", id: key, op: "upsert", value: next }];
  }
  if (!COLLECTION_KEYS.includes(key)) return [];

  const { upserts, deletes } = diffRows(prev, next);
  return [
    ...upserts.map((row) => ({ table: key, id: row.id, op: "upsert", row })),
    ...deletes.map((id) => ({ table: key, id, op: "delete" })),
  ];
}

const entryKey = (entry) => `${entry.table}:${entry.id}`;

// Suma entradas a la cola dejando una sola por fila (vale el último estado)
export function coalesceOutbox(queue, entries) {
  const incoming = new Set(entries.map(entryKey));
  return [...queue.filter((entry) => !incoming.has(entryKey(entry))), ...entries];
}

// Después de subir: saca de la cola exactamente lo que se mandó. Si mientras
// subía llegó un cambio nuevo de la misma fila, ese queda para la próxima.
export function removeSent(queue, sent) {
  const sentJSON = new Set(sent.map((entry) => JSON.stringify(entry)));
  return queue.filter((entry) => !sentJSON.has(JSON.stringify(entry)));
}
