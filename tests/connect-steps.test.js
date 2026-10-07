/* ============================================
   Tests — Connect Steps
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { lastHealthImport, connectSteps } from "../src/utils/connect-steps.js";

/* ---------------------------------------- */
/* Último dato de Salud */
/* ---------------------------------------- */

test("lastHealthImport: el día más nuevo que mandó el Atajo", () => {
  const logs = [
    { id: "a", date: "2026-10-05", steps: 6000, source: "salud" },
    { id: "b", date: "2026-10-07", steps: 900, source: "manual" },
    { id: "c", date: "2026-10-06", steps: 8123, source: "salud" },
  ];
  assert.deepEqual(lastHealthImport(logs), { date: "2026-10-06", steps: 8123 });
});

test("lastHealthImport: sin datos del Atajo → null", () => {
  assert.equal(lastHealthImport([{ id: "m", date: "2026-10-06", steps: 100 }]), null);
  assert.equal(lastHealthImport([]), null);
  assert.equal(lastHealthImport(null), null);
});

/* ---------------------------------------- */
/* Estado de los pasos de la guía */
/* ---------------------------------------- */

const IMPORT = { date: "2026-10-06", steps: 8123 };

test("connectSteps: sin sesión, el primer paso es el actual", () => {
  assert.deepEqual(connectSteps({ signedIn: false, hasKey: false, lastImport: null }), {
    status: ["current", "todo", "todo", "todo", "todo", "todo"],
    connected: false,
  });
});

test("connectSteps: con sesión y sin clave, toca generarla", () => {
  assert.deepEqual(connectSteps({ signedIn: true, hasKey: false, lastImport: null }).status, [
    "done", "current", "todo", "todo", "todo", "todo",
  ]);
});

test("connectSteps: con clave y sin datos, toca instalar el Atajo", () => {
  assert.deepEqual(connectSteps({ signedIn: true, hasKey: true, lastImport: null }).status, [
    "done", "done", "current", "todo", "todo", "todo",
  ]);
});

test("connectSteps: si no se pudo saber si hay clave (null), no se da por hecha", () => {
  assert.equal(connectSteps({ signedIn: true, hasKey: null, lastImport: null }).status[1], "current");
});

test("connectSteps: con datos de Salud, todo hecho y conectado", () => {
  assert.deepEqual(connectSteps({ signedIn: true, hasKey: true, lastImport: IMPORT }), {
    status: ["done", "done", "done", "done", "done", "done"],
    connected: true,
  });
  // Llegaron datos aunque la consulta de la clave haya fallado: la clave existe
  assert.equal(connectSteps({ signedIn: true, hasKey: null, lastImport: IMPORT }).connected, true);
});

test("connectSteps: sin sesión no cuenta nada como hecho", () => {
  assert.equal(connectSteps({ signedIn: false, hasKey: true, lastImport: IMPORT }).status[0], "current");
});
