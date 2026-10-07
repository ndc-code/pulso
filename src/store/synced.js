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

// Un dispositivo "vinculado" ya se sincronizó con una cuenta ("_sync" guarda
// cuál). Sus cambios se anotan siempre, aunque la sincronización todavía no
// haya arrancado (al abrir la app) o esté parada (sin red, sesión vencida):
// quedan en la cola y se suben cuando vuelve. Sin cuenta no se anota nada.
async function isLinked() {
  return isActive() || Boolean((await local.read("_sync"))?.user_id);
}

export async function write(key, value) {
  const linked = await isLinked();
  const prev = linked ? await local.read(key) : null;
  await local.write(key, value);
  if (!linked) return;

  const entries = outboxEntriesFor(key, prev, value);
  // Sin await: la pantalla no espera a la red
  if (entries.length) enqueue(entries);
}
