/* ============================================
   Tests — Chart
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { niceTicks, monthTicks } from "../src/utils/chart.js";

test("niceTicks: valores redondos dentro del rango", () => {
  assert.deepEqual(niceTicks(76.4, 83.1), [77.5, 80, 82.5]);
  assert.deepEqual(niceTicks(0, 100), [0, 50, 100]);
  assert.deepEqual(niceTicks(79.2, 80.4), [79.5, 80]);
  // con la meta abajo el rango se estira: igual tiene que dar 3 valores, no 1
  assert.deepEqual(niceTicks(75.03, 83.48), [77.5, 80, 82.5]);
});

test("niceTicks: sin rango devuelve el valor solo", () => {
  assert.deepEqual(niceTicks(80, 80), [80]);
});

test("monthTicks: el primer día de cada mes entre las dos fechas", () => {
  assert.deepEqual(monthTicks("2026-07-05", "2026-10-05"), ["2026-08-01", "2026-09-01", "2026-10-01"]);
  assert.deepEqual(monthTicks("2026-12-20", "2027-01-10"), ["2027-01-01"]);
  assert.deepEqual(monthTicks("2026-10-01", "2026-10-20"), []);
});
