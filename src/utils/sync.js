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

/* ---------------------------------------- */
/* Bajada */
/* ---------------------------------------- */

// Une lo que bajó (filas de la tabla: { id, data, deleted_at }) con la lista
// local. Si una fila tiene un cambio local que todavía no se subió
// (pendingIds), se respeta el local: se va a subir y va a ganar.
export function mergeRemote(localRows, remoteRows, pendingIds = new Set()) {
  const rows = new Map((localRows ?? []).map((row) => [row.id, row]));
  for (const remote of remoteRows) {
    if (pendingIds.has(remote.id)) continue;
    if (remote.deleted_at) rows.delete(remote.id);
    else rows.set(remote.id, remote.data);
  }
  return [...rows.values()];
}

// Para las colecciones de una fila por día (steps_log): si quedaron dos del
// mismo día (cargado a mano sin red + el Atajo), queda la que bajó más nueva
// (newestIds va de más vieja a más nueva); si ninguna bajó, la última.
export function dedupeByDate(rows, newestIds = []) {
  const rank = new Map(newestIds.map((id, index) => [id, index + 1]));
  const keep = new Map(); // date → fila que queda

  for (const row of rows) {
    const current = keep.get(row.date);
    if (!current || (rank.get(row.id) ?? 0) >= (rank.get(current.id) ?? 0)) keep.set(row.date, row);
  }

  const kept = new Set([...keep.values()].map((row) => row.id));
  return {
    rows: rows.filter((row) => kept.has(row.id)),
    deletedIds: rows.filter((row) => !kept.has(row.id)).map((row) => row.id),
  };
}

// El updated_at más nuevo de lo que bajó: el cursor de la próxima vez
export function latestUpdatedAt(rows) {
  let latest = null;
  for (const row of rows) {
    if (latest === null || Date.parse(row.updated_at) > Date.parse(latest)) latest = row.updated_at;
  }
  return latest;
}

// El cursor con un margen para atrás: filas que se confirmaron en paralelo
// pueden tener un updated_at apenas anterior. Repetir filas no rompe nada.
export function cursorWithMargin(iso, seconds = 60) {
  if (!iso) return null;
  return new Date(Date.parse(iso) - seconds * 1000).toISOString();
}

// Claves con datos que carga la persona (no cuentan los hábitos sembrados
// ni el perfil por defecto)
export const USER_DATA_KEYS = [
  "habit_log", "water_log", "steps_log", "workout", "meal", "sleep",
  "mood", "lab_result", "body", "sesion_fuerza",
];

export function hasLocalUserData(data) {
  return USER_DATA_KEYS.some((key) => Array.isArray(data[key]) && data[key].length > 0);
}

/* ---------------------------------------- */
/* Estado */
/* ---------------------------------------- */

const changes = (count) => (count === 1 ? "1 cambio" : `${count} cambios`);

// Texto del estado para el bloque "Cuenta" de Perfil
export function syncStatusText({ pending, lastSyncAt, online, error }, now = new Date()) {
  if (!online) return pending ? `Sin conexión · ${changes(pending)} sin subir` : "Sin conexión";
  if (pending) return `${changes(pending)} sin subir`;
  if (error) return "No se pudo sincronizar";
  if (!lastSyncAt) return "Sincronizando…";

  const minutes = Math.floor((now - new Date(lastSyncAt)) / 60_000);
  if (minutes < 1) return "Sincronizado recién";
  if (minutes < 60) return `Sincronizado hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Sincronizado hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Sincronizado hace ${days} ${days === 1 ? "día" : "días"}`;
}
