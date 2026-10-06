/* ============================================
   Tests — Dates
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { toDateKey, addDays, weekdayOf, startOfWeek, weekKeys, longDate } from "../src/utils/dates.js";

test("toDateKey usa la fecha LOCAL, no UTC", () => {
  // 23:30 hora local sigue siendo el mismo día, aunque en UTC ya sea el siguiente
  assert.equal(toDateKey(new Date(2026, 9, 5, 23, 30)), "2026-10-05");
  assert.equal(toDateKey(new Date(2026, 0, 3, 0, 5)), "2026-01-03");
});

test("addDays cruza meses y años", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29"); // bisiesto
  assert.equal(addDays("2026-10-05", 0), "2026-10-05");
});

test("weekdayOf devuelve 0 = domingo ... 6 = sábado", () => {
  assert.equal(weekdayOf("2026-10-04"), 0); // domingo
  assert.equal(weekdayOf("2026-10-05"), 1); // lunes
  assert.equal(weekdayOf("2026-10-10"), 6); // sábado
});

test("startOfWeek: la semana empieza el lunes", () => {
  assert.equal(startOfWeek("2026-10-05"), "2026-10-05"); // lunes → mismo día
  assert.equal(startOfWeek("2026-10-08"), "2026-10-05"); // jueves
  assert.equal(startOfWeek("2026-10-11"), "2026-10-05"); // domingo → lunes anterior
});

test("weekKeys devuelve lunes a domingo", () => {
  const keys = weekKeys("2026-10-08");
  assert.equal(keys.length, 7);
  assert.equal(keys[0], "2026-10-05");
  assert.equal(keys[6], "2026-10-11");
});

test("longDate: día de la semana, número y mes, en castellano", () => {
  // es lo que se ve debajo del título de cada sección
  assert.equal(longDate(new Date(2026, 9, 6)), "martes, 6 de octubre");
  assert.equal(longDate(new Date(2026, 0, 1, 23, 59)), "jueves, 1 de enero");
});
