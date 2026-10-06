/* ============================================
   Utils — Health
   ============================================ */

// Cálculos puros de salud (spec 4.5): análisis clínicos, peso y cintura.
// No leen ni guardan nada.
//
//   lab_result: { id, date, ldl, hdl, total, tg, lpa, glucose, extra: {} }   (null = no se midió)
//   body:       { id, date, weight, waist }
//   lab_range:  { ldl: { low, high }, ... }   rango de referencia editable (null = sin límite)

import { addDays } from "./dates.js";

// Indicadores de los análisis. `scale` es el recorrido del dial (no es un rango médico);
// `range` es la referencia habitual en adultos, para arrancar: se edita con lo que
// diga el laboratorio o el médico.
export const LAB_INDICATORS = [
  { key: "ldl", label: "LDL", name: "Colesterol LDL", unit: "mg/dL", scale: [0, 250], range: { low: null, high: 100 } },
  { key: "hdl", label: "HDL", name: "Colesterol HDL", unit: "mg/dL", scale: [0, 100], range: { low: 40, high: null } },
  { key: "total", label: "Total", name: "Colesterol total", unit: "mg/dL", scale: [100, 300], range: { low: null, high: 200 } },
  { key: "tg", label: "TG", name: "Triglicéridos", unit: "mg/dL", scale: [0, 400], range: { low: null, high: 150 } },
  { key: "glucose", label: "Glucemia", name: "Glucemia en ayunas", unit: "mg/dL", scale: [50, 200], range: { low: 70, high: 100 } },
  // Lp(a): mayormente genética, se muestra aparte (spec 4.5)
  { key: "lpa", label: "Lp(a)", name: "Lipoproteína (a)", unit: "mg/dL", scale: [0, 200], range: { low: null, high: 50 }, genetic: true },
];

export const indicator = (key) => LAB_INDICATORS.find((i) => i.key === key);

export function defaultRanges() {
  return Object.fromEntries(LAB_INDICATORS.map((i) => [i.key, { ...i.range }]));
}

// "in" dentro del rango · "high" arriba · "low" abajo · null si no hay valor o rango
export function labStatus(value, range) {
  if (value == null || !range || (range.low == null && range.high == null)) return null;
  if (range.high != null && value > range.high) return "high";
  if (range.low != null && value < range.low) return "low";
  return "in";
}

// "< 100" · "> 40" · "70–100"
export function rangeLabel(range) {
  if (range?.low != null && range?.high != null) return `${range.low}–${range.high}`;
  if (range?.high != null) return `< ${range.high}`;
  if (range?.low != null) return `> ${range.low}`;
  return "sin rango";
}

// Puntos { date, value } de un campo, por fecha y sin vacíos
function series(rows, field) {
  return rows
    .filter((row) => row[field] != null && row[field] !== "")
    .map((row) => ({ date: row.date, value: Number(row[field]) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export const labSeries = (results, key) => series(results, key);
export const bodySeries = (body, field) => series(body, field);

export function latestLab(results, key) {
  return labSeries(results, key).at(-1) ?? null;
}

// Peso: el último registro y cuánto cambió.
// Se compara contra el último registro de hace 30 días o más; si no hay,
// contra el primero. { latest, delta, since } — delta null con un solo registro.
export function bodyTrend(body, today, days = 30) {
  const withWeight = [...body]
    .filter((row) => row.weight != null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!withWeight.length) return null;

  const latest = withWeight.at(-1);
  const before = withWeight.slice(0, -1);
  const cutoff = addDays(today, -days);
  const base = before.filter((row) => row.date <= cutoff).at(-1) ?? before[0];

  return {
    latest,
    delta: base ? Math.round((latest.weight - base.weight) * 10) / 10 : null,
    since: base?.date ?? null,
  };
}

// Pérdida de peso: el primer y el último registro, el cambio entre los dos,
// el cambio contra el pesaje anterior y cuánto falta para la meta (en kg, 0 si ya se alcanzó).
// { latest, start, previous, change, lastChange, toGoal, reached }
// previous y lastChange son null con un solo registro; toGoal es null sin meta.
export function weightProgress(body, goal) {
  const withWeight = [...body]
    .filter((row) => row.weight != null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!withWeight.length) return null;

  const start = withWeight[0];
  const latest = withWeight.at(-1);
  const previous = withWeight.at(-2) ?? null;
  const round1 = (n) => Math.round(n * 10) / 10;
  const hasGoal = goal != null;

  return {
    latest,
    start,
    previous,
    change: round1(latest.weight - start.weight),
    lastChange: previous ? round1(latest.weight - previous.weight) : null,
    toGoal: hasGoal ? Math.max(0, round1(latest.weight - goal)) : null,
    reached: hasGoal && latest.weight <= goal,
  };
}
