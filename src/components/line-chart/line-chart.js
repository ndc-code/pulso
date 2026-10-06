/* ============================================
   Components — Line Chart
   ============================================ */

// Gráfico de evolución (como la card "Body weight" de openGym, escrito desde cero):
// una línea fina con un punto por medición, el último en naranja,
// y líneas punteadas para el rango de referencia o la meta.
//
//   lineChart({
//     points: [{ date: "2026-08-01", value: 82 }, ...],   // ordenados por fecha
//     unit: "kg",
//     limits: [{ value: 100, label: "100" }],              // opcional: líneas punteadas
//     format: (n) => n.toLocaleString("es-AR"),           // opcional
//   })
//
// La línea es un SVG que se estira a todo el ancho (preserveAspectRatio="none"
// con trazo que no se deforma); los puntos y los textos son HTML posicionado
// en %, para que no se estiren con el SVG.
// Para lectores de pantalla el gráfico se describe con una lista oculta.

import { escapeHTML } from "../../utils/html.js";
import { fromDateKey, shortDate } from "../../utils/dates.js";

export function lineChart({ points, unit = "", limits = [], format = String }) {
  if (!points.length) return "";

  // Eje Y: de los valores y las líneas de referencia, con un poco de aire
  const values = [...points.map((p) => p.value), ...limits.map((l) => l.value)];
  let low = Math.min(...values);
  let high = Math.max(...values);
  const pad = (high - low) * 0.15 || Math.max(1, Math.abs(high) * 0.05);
  low -= pad;
  high += pad;
  const y = (value) => 100 - ((value - low) / (high - low)) * 100;

  // Eje X: por tiempo (no por cantidad de mediciones), para que los saltos se vean
  const first = fromDateKey(points[0].date).getTime();
  const last = fromDateKey(points.at(-1).date).getTime();
  const span = last - first;
  const x = (date) => (span ? ((fromDateKey(date).getTime() - first) / span) * 100 : 50);

  const coords = points.map((p) => ({ ...p, x: round(x(p.date)), y: round(y(p.value)) }));
  const path = coords.map((c, i) => `${i ? "L" : "M"} ${c.x} ${c.y}`).join(" ");

  const dots = coords
    .map((c, i) => {
      const isLast = i === coords.length - 1;
      return `<span class="line-chart__dot${isLast ? " is-last" : ""}" style="left: ${c.x}%; top: ${c.y}%"></span>`;
    })
    .join("");

  const lines = limits
    .map((l) => {
      const top = round(y(l.value));
      return `
        <span class="line-chart__limit" style="top: ${top}%"></span>
        <span class="line-chart__limit-label" style="top: ${top}%">${escapeHTML(l.label)}</span>
      `;
    })
    .join("");

  const lastPoint = coords.at(-1);
  const described = points
    .map((p) => `<li>${escapeHTML(shortDate(p.date))}: ${escapeHTML(format(p.value))} ${escapeHTML(unit)}</li>`)
    .join("");

  return `
    <div class="line-chart">
      <div class="line-chart__plot" aria-hidden="true">
        ${lines}
        <svg class="line-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="${path}" vector-effect="non-scaling-stroke" />
        </svg>
        ${dots}
        <span class="line-chart__value" style="left: ${lastPoint.x}%; top: ${lastPoint.y}%">${escapeHTML(format(lastPoint.value))}</span>
      </div>
      <div class="line-chart__axis" aria-hidden="true">
        <span>${escapeHTML(shortDate(points[0].date))}</span>
        ${points.length > 1 ? `<span>${escapeHTML(shortDate(points.at(-1).date))}</span>` : ""}
      </div>
      <ul class="visually-hidden">${described}</ul>
    </div>
  `;
}

const round = (n) => Math.round(n * 100) / 100;
