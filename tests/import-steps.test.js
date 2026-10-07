/* ============================================
   Tests — Import Steps
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStepsPayload } from "../supabase/functions/import-steps/validate.js";

const now = new Date("2026-10-06T15:00:00Z");

test("acepta el día de hoy y redondea", () => {
  assert.deepEqual(validateStepsPayload({ date: "2026-10-06", steps: 8123 }, now), { ok: true, date: "2026-10-06", steps: 8123 });
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: 8123.6 }, now).steps, 8124);
});

test("acepta pasos como texto solo si son dígitos", () => {
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: "8123" }, now).steps, 8123);
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: "8.123" }, now).ok, false);
});

test("fechas: hasta mañana (husos horarios) y hasta 30 días atrás", () => {
  assert.equal(validateStepsPayload({ date: "2026-10-07", steps: 1 }, now).ok, true);
  assert.equal(validateStepsPayload({ date: "2026-10-08", steps: 1 }, now).ok, false);
  assert.equal(validateStepsPayload({ date: "2026-09-06", steps: 1 }, now).ok, true);
  assert.equal(validateStepsPayload({ date: "2026-09-05", steps: 1 }, now).ok, false);
});

test("rechaza fechas inválidas", () => {
  assert.equal(validateStepsPayload({ date: "2026-02-30", steps: 1 }, now).ok, false);
  assert.equal(validateStepsPayload({ date: "06/10/2026", steps: 1 }, now).ok, false);
});

test("rechaza pasos fuera de rango o que faltan", () => {
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: -1 }, now).ok, false);
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: 100001 }, now).ok, false);
  assert.equal(validateStepsPayload({ date: "2026-10-06" }, now).ok, false);
  assert.equal(validateStepsPayload(null, now).ok, false);
});

test("los errores traen un mensaje para mostrar", () => {
  const result = validateStepsPayload({ date: "2026-10-08", steps: 1 }, now);
  assert.equal(typeof result.error, "string");
  assert.ok(result.error.length > 0);
});
