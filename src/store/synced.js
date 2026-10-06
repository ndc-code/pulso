/* ============================================
   Store — Synced
   ============================================ */

// Adaptador que usa store.js. Misma firma que local.js (read, write, remove):
// guarda en este dispositivo y, si hay sesión, anota qué filas cambiaron
// para que sync.js las suba a Supabase. Las vistas no se enteran de nada.
//
// Como compara el valor anterior con el nuevo, sirve para cualquier forma
// de guardar: add/update/remove, un set() de la lista entera (reordenar
// hábitos, importar un backup) o un set() de un objeto (el perfil).

import * as local from "./local.js";
import { outboxEntriesFor } from "../utils/sync.js";
import { isActive, enqueue } from "./sync.js";

export const read = local.read;
export const remove = local.remove;

export async function write(key, value) {
  const prev = isActive() ? await local.read(key) : null;
  await local.write(key, value);
  if (!isActive()) return;

  const entries = outboxEntriesFor(key, prev, value);
  // Sin await: la pantalla no espera a la red
  if (entries.length) enqueue(entries);
}
