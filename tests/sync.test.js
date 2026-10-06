/* ============================================
   Tests — Sync
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diffRows,
  toRemoteRow,
  outboxEntriesFor,
  coalesceOutbox,
  removeSent,
  mergeRemote,
  dedupeByDate,
  latestUpdatedAt,
  cursorWithMargin,
  hasLocalUserData,
  syncStatusText,
} from "../src/utils/sync.js";

/* ---------------------------------------- */
/* Subida */
/* ---------------------------------------- */

test("diffRows: filas nuevas y cambiadas se suben, las iguales no", () => {
  const prev = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  const next = [{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "c", v: 1 }];
  assert.deepEqual(diffRows(prev, next), {
    upserts: [{ id: "b", v: 2 }, { id: "c", v: 1 }],
    deletes: [],
  });
});

test("diffRows: las que faltan se borran", () => {
  assert.deepEqual(diffRows([{ id: "a" }, { id: "b" }], [{ id: "a" }]), { upserts: [], deletes: ["b"] });
});

test("diffRows: sin valor anterior, todo es nuevo", () => {
  assert.deepEqual(diffRows(null, [{ id: "a" }]), { upserts: [{ id: "a" }], deletes: [] });
});

test("toRemoteRow: date sale de date o de fecha (Fuerza)", () => {
  const steps = { id: "x", date: "2026-10-06", steps: 5 };
  assert.deepEqual(toRemoteRow(steps), { id: "x", date: "2026-10-06", data: steps });

  const session = { id: "s", fecha: "2026-10-01", rutina: "A" };
  assert.equal(toRemoteRow(session).date, "2026-10-01");

  assert.equal(toRemoteRow({ id: "h", name: "Ritmo" }).date, null);
});

test("outboxEntriesFor: colección → una entrada por fila", () => {
  const row = { id: "w", date: "2026-10-06", glasses: 2 };
  assert.deepEqual(outboxEntriesFor("water_log", [], [row]), [
    { table: "water_log", id: "w", op: "upsert", row },
  ]);
  assert.deepEqual(outboxEntriesFor("habit", [{ id: "h" }], []), [
    { table: "habit", id: "h", op: "delete" },
  ]);
});

test("outboxEntriesFor: objeto → user_doc, solo si cambió", () => {
  assert.deepEqual(outboxEntriesFor("profile", { name: "A" }, { name: "B" }), [
    { table: "user_doc", id: "profile", op: "upsert", value: { name: "B" } },
  ]);
  assert.deepEqual(outboxEntriesFor("profile", { name: "A" }, { name: "A" }), []);
  assert.deepEqual(outboxEntriesFor("entreno_actual", { inicio: "x" }, null), [
    { table: "user_doc", id: "entreno_actual", op: "upsert", value: null },
  ]);
});

test("outboxEntriesFor: claves internas no se suben", () => {
  assert.deepEqual(outboxEntriesFor("_sync", null, { user_id: "u" }), []);
  assert.deepEqual(outboxEntriesFor("_outbox", [], [{ id: "x" }]), []);
});

test("coalesceOutbox: la entrada nueva de una fila reemplaza a la vieja", () => {
  const queue = [
    { table: "habit", id: "a", op: "upsert", row: { id: "a", v: 1 } },
    { table: "meal", id: "a", op: "upsert", row: { id: "a" } },
  ];
  const entries = [{ table: "habit", id: "a", op: "delete" }];
  assert.deepEqual(coalesceOutbox(queue, entries), [
    { table: "meal", id: "a", op: "upsert", row: { id: "a" } },
    { table: "habit", id: "a", op: "delete" },
  ]);
});

test("removeSent: saca lo que se mandó, deja lo que cambió mientras tanto", () => {
  const sentA = { table: "habit", id: "a", op: "upsert", row: { id: "a", v: 1 } };
  const oldB = { table: "habit", id: "b", op: "upsert", row: { id: "b", v: 1 } };
  const newB = { table: "habit", id: "b", op: "upsert", row: { id: "b", v: 2 } };
  assert.deepEqual(removeSent([sentA, newB], [sentA, oldB]), [newB]);
});

/* ---------------------------------------- */
/* Bajada */
/* ---------------------------------------- */

test("mergeRemote: reemplaza, agrega y saca las borradas", () => {
  const local = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  const remote = [
    { id: "a", data: { id: "a", v: 2 }, deleted_at: null },
    { id: "b", data: { id: "b", v: 1 }, deleted_at: "2026-10-06T10:00:00+00:00" },
    { id: "c", data: { id: "c", v: 1 }, deleted_at: null },
  ];
  assert.deepEqual(mergeRemote(local, remote), [{ id: "a", v: 2 }, { id: "c", v: 1 }]);
});

test("mergeRemote: lo que todavía no se subió gana", () => {
  const local = [{ id: "a", v: 1 }];
  const remote = [{ id: "a", data: { id: "a", v: 2 }, deleted_at: null }];
  assert.deepEqual(mergeRemote(local, remote, new Set(["a"])), [{ id: "a", v: 1 }]);
});

test("mergeRemote: borrar algo que no está no hace nada", () => {
  const remote = [{ id: "z", data: { id: "z" }, deleted_at: "2026-10-06T10:00:00+00:00" }];
  assert.deepEqual(mergeRemote([{ id: "a" }], remote), [{ id: "a" }]);
  assert.deepEqual(mergeRemote(null, []), []);
});

test("dedupeByDate: una fila por día, gana la que bajó más nueva", () => {
  const rows = [
    { id: "m", date: "2026-10-06", steps: 100 },   // a mano
    { id: "s", date: "2026-10-06", steps: 900 },   // del Atajo
    { id: "x", date: "2026-10-05", steps: 5 },
  ];
  assert.deepEqual(dedupeByDate(rows, ["s"]), {
    rows: [{ id: "s", date: "2026-10-06", steps: 900 }, { id: "x", date: "2026-10-05", steps: 5 }],
    deletedIds: ["m"],
  });
});

test("dedupeByDate: si ninguna bajó, queda la última", () => {
  const rows = [{ id: "m", date: "2026-10-06" }, { id: "n", date: "2026-10-06" }];
  assert.deepEqual(dedupeByDate(rows), { rows: [{ id: "n", date: "2026-10-06" }], deletedIds: ["m"] });
});

test("latestUpdatedAt: el más nuevo, o null", () => {
  const rows = [
    { updated_at: "2026-10-06T10:00:00.5+00:00" },
    { updated_at: "2026-10-06T12:00:00+00:00" },
    { updated_at: "2026-10-06T11:00:00+00:00" },
  ];
  assert.equal(latestUpdatedAt(rows), "2026-10-06T12:00:00+00:00");
  assert.equal(latestUpdatedAt([]), null);
});

test("cursorWithMargin: 60 segundos antes", () => {
  assert.equal(cursorWithMargin("2026-10-06T12:00:00+00:00"), "2026-10-06T11:59:00.000Z");
  assert.equal(cursorWithMargin(null), null);
});

test("hasLocalUserData: cuenta registros, no hábitos ni perfil", () => {
  assert.equal(hasLocalUserData({ habit: [{ id: "h" }], habit_log: [] }), false);
  assert.equal(hasLocalUserData({ water_log: [{ id: "w" }] }), true);
  assert.equal(hasLocalUserData({}), false);
});

/* ---------------------------------------- */
/* Estado */
/* ---------------------------------------- */

test("syncStatusText", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  const base = { pending: 0, lastSyncAt: null, online: true, error: false };

  assert.equal(syncStatusText({ ...base, online: false }, now), "Sin conexión");
  assert.equal(syncStatusText({ ...base, online: false, pending: 2 }, now), "Sin conexión · 2 cambios sin subir");
  assert.equal(syncStatusText({ ...base, pending: 1 }, now), "1 cambio sin subir");
  assert.equal(syncStatusText({ ...base, error: true }, now), "No se pudo sincronizar");
  assert.equal(syncStatusText(base, now), "Sincronizando…");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-06T11:59:30Z" }, now), "Sincronizado recién");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-06T11:58:00Z" }, now), "Sincronizado hace 2 min");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-06T09:00:00Z" }, now), "Sincronizado hace 3 h");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-05T11:00:00Z" }, now), "Sincronizado hace 1 día");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-03T12:00:00Z" }, now), "Sincronizado hace 3 días");
});
