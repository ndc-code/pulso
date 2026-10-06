/* ============================================
   Store — Health
   ============================================ */

// Escrituras de salud: análisis clínicos, peso y cintura, y rangos de referencia.

import { get, set, add, update, remove } from "./store.js";

// Análisis: cada carga es una fila nueva (puede haber dos el mismo día)
export async function addLabResult(row) {
  await add("lab_result", row);
}

// Peso y cintura: un registro por día; si ya hay uno, se pisa
export async function saveBody({ date, weight, waist }) {
  const rows = await get("body");
  const existing = rows.find((row) => row.date === date);
  if (existing) await update("body", existing.id, { weight, waist });
  else await add("body", { date, weight, waist });
}

export async function removeBody(id) {
  await remove("body", id);
}

// Rangos de todos los indicadores: { ldl: { low, high }, ... } (null = sin límite)
export async function saveRanges(ranges) {
  await set("lab_range", ranges);
}
