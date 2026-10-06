/* ============================================
   Tests — Health
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { labStatus, labSeries, latestLab, bodySeries, bodyTrend, defaultRanges, LAB_INDICATORS } from "../src/utils/health.js";

const TODAY = "2026-10-08";

test("labStatus: con límite de arriba solamente (LDL < 100)", () => {
  const range = { low: null, high: 100 };
  assert.equal(labStatus(90, range), "in");
  assert.equal(labStatus(100, range), "in");
  assert.equal(labStatus(130, range), "high");
});

test("labStatus: con límite de abajo solamente (HDL > 40)", () => {
  const range = { low: 40, high: null };
  assert.equal(labStatus(55, range), "in");
  assert.equal(labStatus(35, range), "low");
});

test("labStatus: con los dos límites (glucemia 70–100)", () => {
  const range = { low: 70, high: 100 };
  assert.equal(labStatus(85, range), "in");
  assert.equal(labStatus(65, range), "low");
  assert.equal(labStatus(110, range), "high");
});

test("labStatus: sin valor o sin rango no hay estado", () => {
  assert.equal(labStatus(null, { low: 0, high: 100 }), null);
  assert.equal(labStatus(90, { low: null, high: null }), null);
});

const results = [
  { id: "2", date: "2026-06-10", ldl: 120, hdl: 45, lpa: null },
  { id: "1", date: "2026-01-15", ldl: 150, hdl: 40, lpa: 80 },
  { id: "3", date: "2026-09-20", ldl: null, hdl: 50 },
];

test("labSeries: valores de un indicador ordenados por fecha, sin vacíos", () => {
  assert.deepEqual(labSeries(results, "ldl"), [
    { date: "2026-01-15", value: 150 },
    { date: "2026-06-10", value: 120 },
  ]);
});

test("latestLab: el último valor cargado de ese indicador", () => {
  assert.deepEqual(latestLab(results, "ldl"), { date: "2026-06-10", value: 120 });
  assert.deepEqual(latestLab(results, "hdl"), { date: "2026-09-20", value: 50 });
  assert.equal(latestLab(results, "glucose"), null);
});

test("defaultRanges: un rango por indicador", () => {
  const ranges = defaultRanges();
  assert.equal(Object.keys(ranges).length, LAB_INDICATORS.length);
  assert.deepEqual(ranges.ldl, { low: null, high: 100 });
});

const body = [
  { id: "a", date: "2026-08-01", weight: 82, waist: 98 },
  { id: "b", date: "2026-09-05", weight: 80.6, waist: null },
  { id: "c", date: "2026-10-07", weight: 79.9, waist: 95 },
];

test("bodySeries: peso o cintura por fecha, sin vacíos", () => {
  assert.equal(bodySeries(body, "weight").length, 3);
  assert.deepEqual(bodySeries(body, "waist").map((p) => p.value), [98, 95]);
});

test("bodyTrend: último peso y cambio contra hace 30 días", () => {
  const trend = bodyTrend(body, TODAY);
  assert.equal(trend.latest.weight, 79.9);
  assert.equal(trend.since, "2026-09-05");
  assert.equal(trend.delta, -0.7);
});

test("bodyTrend: sin registro de hace 30 días compara contra el primero", () => {
  const recent = [{ date: "2026-09-20", weight: 80.4 }, body[2]];
  const trend = bodyTrend(recent, TODAY);
  assert.equal(trend.since, "2026-09-20");
  assert.equal(trend.delta, -0.5);
});

test("bodyTrend: si el último registro es viejo, compara contra el anterior", () => {
  const trend = bodyTrend(body.slice(0, 2), TODAY);
  assert.equal(trend.latest.weight, 80.6);
  assert.equal(trend.since, "2026-08-01");
  assert.equal(trend.delta, -1.4);
});

test("bodyTrend: con un solo registro no hay cambio", () => {
  const trend = bodyTrend([body[0]], TODAY);
  assert.equal(trend.latest.weight, 82);
  assert.equal(trend.delta, null);
});

test("bodyTrend: sin registros", () => {
  assert.equal(bodyTrend([], TODAY), null);
});
