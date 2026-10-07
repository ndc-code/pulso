/* ============================================
   Store — Sync
   ============================================ */

// Sincronización con Supabase. Ver docs/superpowers/specs/2026-10-06-supabase-sync-design.md
//
//   Subir: cada write() del store anota sus cambios en la cola "_outbox"
//          (synced.js → enqueue) y push() los manda. Lo que falla queda en
//          la cola y se reintenta.
//   Bajar: pull() trae de cada tabla lo que cambió desde la última vez
//          (un cursor por tabla en "_sync") y lo escribe directo con
//          local.js, sin pasar por la cola.
//
// Cuándo: al arrancar con sesión, al volver a la app, al volver la red y
// después de cada cambio (subida con una espera corta para juntar varios).
// Lo que decide algo son funciones puras en utils/sync.js.

import * as local from "./local.js";
import { getClient } from "./supabase.js";
import {
  COLLECTION_KEYS,
  DOC_KEYS,
  outboxEntriesFor,
  toRemoteRow,
  coalesceOutbox,
  removeSent,
  mergeRemote,
  dedupeByDate,
  latestUpdatedAt,
  cursorWithMargin,
  hasLocalUserData,
  sameValue,
} from "../utils/sync.js";

const PAGE = 1000;          // Supabase devuelve como máximo 1000 filas por pedido
const PUSH_DELAY = 1000;    // ms de espera para juntar cambios seguidos
const DELETE_CHUNK = 100;   // ids por pedido al borrar (van en la URL, que tiene un límite)

let client = null;
let userId = null;
let lastSyncAt = null;
let lastError = null;
let pushFailed = false;                // alguna tabla no se pudo subir la última vez
// Sube al cerrar sesión o parar: una bajada que ya estaba en curso se da
// cuenta (su número quedó viejo) y deja de escribir.
let generation = 0;
let syncing = null;                    // syncNow() en curso
let pushing = null;                    // push() en curso
let pushAgain = false;                 // llegaron cambios mientras subía
let pushTimer = null;
let outboxChain = Promise.resolve();   // cambios de la cola, en fila
let listening = false;
const statusListeners = new Set();

export function isActive() {
  return userId !== null;
}

// Arranca la sincronización con una sesión.
//   "ok"         sincronizando
//   "cancelled"  la persona no quiso reemplazar sus datos (hay que cerrar la sesión)
//   "error"      no se pudo hablar con Supabase (se reintenta la próxima vez)
export async function start(session, { confirmReplace }) {
  client = await getClient();
  if (!client) return "error";
  // userId recién se fija cuando termina el primer login: hasta entonces
  // isActive() es false y nada se sube a una cuenta que todavía no se revisó
  const id = session.user.id;
  const gen = generation;

  try {
    if (!(await firstLoginIfNeeded(id, confirmReplace, gen))) return "cancelled";
  } catch (error) {
    console.warn("[sync] no se pudo preparar la cuenta", error);
    lastError = error;
    notifyStatus();
    return "error";
  }
  // Se cerró la sesión mientras se preparaba la cuenta: no se arranca
  if (gen !== generation) return "cancelled";

  userId = id;
  listenOnce();
  syncNow();
  return "ok";
}

// Deja de sincronizar sin tocar los datos (por ejemplo, si la sesión vence)
export function stop() {
  userId = null;
  generation++;
  notifyStatus();
}

/* ---------------------------------------- */
/* Primer login en este dispositivo */
/* ---------------------------------------- */

// Devuelve false si la persona canceló
async function firstLoginIfNeeded(id, confirmReplace, gen) {
  const state = await local.read("_sync");
  if (state?.user_id === id) return true;

  if (await isAccountEmpty()) {
    // Primer login de la cuenta: lo de este dispositivo se sube entero
    const entries = [];
    for (const key of COLLECTION_KEYS) entries.push(...outboxEntriesFor(key, [], await local.read(key)));
    for (const key of DOC_KEYS) {
      const value = await local.read(key);
      if (value != null) entries.push(...outboxEntriesFor(key, undefined, value));
    }
    await mutateOutbox(() => entries);
    await local.write("_sync", { user_id: id, cursors: {} });
    return true;
  }

  // La cuenta ya tiene datos: manda la nube
  const data = {};
  for (const key of COLLECTION_KEYS) data[key] = await local.read(key);
  if (hasLocalUserData(data) && !(await confirmReplace())) return false;

  for (const key of [...COLLECTION_KEYS, ...DOC_KEYS]) await local.remove(key);
  await mutateOutbox(() => []);
  // Sin "_sync" el dispositivo no está vinculado: lo que se toque mientras
  // baja no se anota en la cola (lo que baja es la verdad)
  await local.remove("_sync");
  // La pantalla de antes se vuelve a pintar vacía, para no editar datos viejos
  window.dispatchEvent(new Event("pulso:refresh"));

  // Primera bajada completa, todavía sin userId. pull() escribe "_sync" al
  // terminar: recién ahí queda vinculado. Si falla, tira error y no queda
  // nada a medias: la próxima vez que se abra la app se repite todo
  // (los hábitos sembrados no cuentan como datos, así que no se duplican).
  if (await pull(id, gen)) window.dispatchEvent(new Event("pulso:refresh"));
  return true;
}

async function isAccountEmpty() {
  const results = await Promise.all(
    ["habit", "user_doc"].map((table) => client.from(table).select("*", { count: "exact", head: true })),
  );
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
  return results.every((result) => result.count === 0);
}

/* ---------------------------------------- */
/* Cola de pendientes */
/* ---------------------------------------- */

// Todos los cambios a "_outbox" pasan en fila: dos guardados seguidos no se pisan
function mutateOutbox(change) {
  outboxChain = outboxChain
    .then(async () => {
      const queue = (await local.read("_outbox")) ?? [];
      await local.write("_outbox", change(queue));
    })
    .catch((error) => console.error("[sync] no se pudo actualizar la cola", error));
  return outboxChain;
}

// Lo llama synced.js en cada write con sesión
export async function enqueue(entries) {
  await mutateOutbox((queue) => coalesceOutbox(queue, entries));
  notifyStatus();
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, PUSH_DELAY);
}

/* ---------------------------------------- */
/* Subir */
/* ---------------------------------------- */

export function push() {
  if (pushing) {
    pushAgain = true;
    return pushing;
  }
  pushing = doPush().finally(() => {
    pushing = null;
    if (pushAgain) {
      pushAgain = false;
      return push(); // se espera: así push() termina con la cola realmente subida
    }
  });
  return pushing;
}

async function doPush() {
  if (!isActive() || !navigator.onLine) return;
  await outboxChain;
  const queue = (await local.read("_outbox")) ?? [];
  if (!queue.length) {
    pushFailed = false;
    return;
  }

  const sent = [];
  let failed = false;
  for (const [table, entries] of groupByTable(queue)) {
    const { error } = await sendTable(table, entries);
    if (error) {
      console.warn(`[sync] no se pudo subir "${table}"`, error);
      failed = true;
    } else {
      sent.push(...entries);
    }
  }
  // Si una tabla falla siempre, el estado de Perfil lo muestra (no solo "N sin subir")
  pushFailed = failed;

  await mutateOutbox((current) => removeSent(current, sent));
  notifyStatus();
}

function groupByTable(queue) {
  const groups = new Map();
  for (const entry of queue) {
    if (!groups.has(entry.table)) groups.set(entry.table, []);
    groups.get(entry.table).push(entry);
  }
  return groups;
}

async function sendTable(table, entries) {
  if (table === "user_doc") {
    const rows = entries.map((entry) => ({ user_id: userId, key: entry.id, value: entry.value }));
    return client.from("user_doc").upsert(rows, { onConflict: "user_id,key" });
  }

  const upserts = entries
    .filter((entry) => entry.op === "upsert")
    .map((entry) => ({ ...toRemoteRow(entry.row), user_id: userId, deleted_at: null }));
  const deletes = entries.filter((entry) => entry.op === "delete").map((entry) => entry.id);

  if (upserts.length) {
    const result = await client.from(table).upsert(upserts, { onConflict: "user_id,id" });
    if (result.error) return result;
  }
  // Borrado suave: si la fila nunca llegó al servidor, no pasa nada.
  // Los ids van en la URL: se mandan de a DELETE_CHUNK (importar un backup
  // viejo puede borrar cientos de filas de una vez).
  for (let from = 0; from < deletes.length; from += DELETE_CHUNK) {
    const result = await client
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("id", deletes.slice(from, from + DELETE_CHUNK));
    if (result.error) return result;
  }
  return { error: null };
}

/* ---------------------------------------- */
/* Bajar */
/* ---------------------------------------- */

// La cola de pendientes se lee DESPUÉS de cada fetchSince: un cambio hecho
// mientras el pedido estaba en vuelo no se tiene que pisar con lo de la nube.
async function pendingQueue() {
  await outboxChain;
  return (await local.read("_outbox")) ?? [];
}

// Baja lo de la cuenta `owner` y al final guarda "_sync" (con los cursores).
// Devuelve true si cambió algo local. `gen` es el número de generation al
// empezar: si cambió (se cerró la sesión), no escribe nada más y devuelve false.
async function pull(owner, gen) {
  const saved = await local.read("_sync");
  // Los cursores solo valen para la misma cuenta; sin "_sync" baja todo
  const state = { user_id: owner, cursors: saved?.user_id === owner ? { ...saved.cursors } : {} };
  const stale = () => gen !== generation;
  let changed = false;

  for (const table of COLLECTION_KEYS) {
    const remote = await fetchSince(table, "id, data, updated_at, deleted_at", "id", state.cursors[table]);
    if (!remote.length) continue;

    // Cola leída recién ahora (después del fetch), ver pendingQueue()
    const queue = await pendingQueue();
    const pending = new Set(queue.filter((entry) => entry.table === table).map((entry) => entry.id));
    const before = (await local.read(table)) ?? [];
    let rows = mergeRemote(before, remote, pending);
    if (stale()) return false;

    if (table === "steps_log") {
      const newestIds = remote.filter((row) => !row.deleted_at).map((row) => row.id);
      const result = dedupeByDate(rows, newestIds);
      rows = result.rows;
      if (result.deletedIds.length) enqueue(result.deletedIds.map((id) => ({ table, id, op: "delete" })));
    }

    if (!sameValue(rows, before)) {
      await local.write(table, rows);
      changed = true;
    }
    state.cursors[table] = latestUpdatedAt(remote);
  }

  const docs = await fetchSince("user_doc", "key, value, updated_at", "key", state.cursors.user_doc);
  // Cola leída recién ahora (después del fetch), ver pendingQueue()
  const docQueue = docs.length ? await pendingQueue() : [];
  for (const doc of docs) {
    if (!DOC_KEYS.includes(doc.key)) continue;
    if (docQueue.some((entry) => entry.table === "user_doc" && entry.id === doc.key)) continue;
    if (!sameValue(await local.read(doc.key), doc.value)) {
      if (stale()) return false;
      await local.write(doc.key, doc.value);
      changed = true;
    }
  }
  if (docs.length) state.cursors.user_doc = latestUpdatedAt(docs);

  if (stale()) return false;
  await local.write("_sync", state);
  return changed;
}

// Todas las filas con updated_at > cursor, de a PAGE. Ordenadas por
// updated_at y después por id/key, para que las páginas no se mezclen.
async function fetchSince(table, columns, idColumn, cursor) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let query = client
      .from(table)
      .select(columns)
      .order("updated_at", { ascending: true })
      .order(idColumn, { ascending: true })
      .range(from, from + PAGE - 1);
    if (cursor) query = query.gt("updated_at", cursorWithMargin(cursor));

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/* ---------------------------------------- */
/* Subir y bajar */
/* ---------------------------------------- */

export function syncNow() {
  if (!isActive()) return Promise.resolve();

  syncing ??= (async () => {
    const owner = userId;
    const gen = generation;
    try {
      await push();
      const changed = await pull(owner, gen);
      lastSyncAt = new Date().toISOString();
      lastError = null;
      // Redibuja la vista y el header con lo que llegó
      if (changed) window.dispatchEvent(new Event("pulso:refresh"));
    } catch (error) {
      lastError = error;
      console.warn("[sync] no se pudo sincronizar", error);
    } finally {
      syncing = null;
      notifyStatus();
    }
  })();

  return syncing;
}

function listenOnce() {
  if (listening) return;
  listening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncNow();
  });
  window.addEventListener("online", () => syncNow());
  window.addEventListener("offline", notifyStatus);
}

/* ---------------------------------------- */
/* Estado */
/* ---------------------------------------- */

export async function getStatus() {
  await outboxChain;
  const queue = (await local.read("_outbox")) ?? [];
  return { pending: queue.length, lastSyncAt, online: navigator.onLine, error: lastError !== null || pushFailed };
}

export function onStatusChange(callback) {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
}

function notifyStatus() {
  statusListeners.forEach((callback) => callback());
}

/* ---------------------------------------- */
/* Cerrar sesión */
/* ---------------------------------------- */

// Borra los datos de este dispositivo (los de la cuenta quedan en Supabase)
export async function clearLocalData() {
  userId = null;
  generation++;
  // Una sincronización en curso deja de escribir (ver pull); se la espera
  // para que no vuelva a guardar nada después de borrar
  await syncing?.catch(() => {});
  await outboxChain;
  for (const key of [...COLLECTION_KEYS, ...DOC_KEYS, "_outbox", "_sync"]) await local.remove(key);
}
