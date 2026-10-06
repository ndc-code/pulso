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
