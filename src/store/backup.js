/* ============================================
   Store — Backup
   ============================================ */

// Exportar e importar todos los datos en JSON (spec 4.6),
// mientras no haya backend que los guarde.

import { get, set } from "./store.js";

const DATA_KEYS = ["profile", "habit", "habit_log", "water_log", "workout", "meal", "sleep", "mood"];
const FORMAT_VERSION = 1;

export async function exportData() {
  const values = await Promise.all(DATA_KEYS.map((key) => get(key)));
  return {
    app: "pulso",
    version: FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    data: Object.fromEntries(DATA_KEYS.map((key, i) => [key, values[i]])),
  };
}

// Valida el archivo antes de pisar nada. Tira un Error con un mensaje
// para mostrarle a la persona si el archivo no sirve.
export async function importData(backup) {
  if (backup?.app !== "pulso" || typeof backup.data !== "object" || backup.data === null) {
    throw new Error("El archivo no es un backup de Pulso.");
  }
  if (backup.version > FORMAT_VERSION) {
    throw new Error("El backup es de una versión más nueva de Pulso.");
  }

  for (const key of DATA_KEYS) {
    if (!(key in backup.data)) continue;
    const value = backup.data[key];
    const expectsList = key !== "profile";
    if (expectsList !== Array.isArray(value)) {
      throw new Error(`El backup tiene un formato inválido en "${key}".`);
    }
  }

  for (const key of DATA_KEYS) {
    if (key in backup.data) await set(key, backup.data[key]);
  }
}
