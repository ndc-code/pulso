/* ============================================
   Components — Bar Chart
   ============================================ */

// Barras finas por día, con línea punteada de meta (estilo de las barras
// de "Steps" de gauge-ui). Los días sin dato muestran un punto.
//
//   barChart({
//     days: [{ label: "L", name: "lunes", value: 50, isToday: false, isFuture: false }, ...],
//     goal: 30, unit: "min", goalLabel: "Meta diaria",
//   })
//
// Para lectores de pantalla el gráfico se describe con una lista oculta.

import { escapeHTML } from "../../utils/html.js";

export function barChart({ days, goal = 0, unit = "", goalLabel = "Meta" }) {
  const top = Math.max(goal * 1.25, ...days.map((d) => d.value), 1);
  const pct = (value) => Math.round((value / top) * 100);

  const columns = days
    .map((day) => {
      const classes = ["bars__col", day.isToday && "is-today", day.isFuture && "is-future", !day.value && "is-empty"]
        .filter(Boolean)
        .join(" ");
      return `
        <div class="${classes}">
          <span class="bars__bar" style="height: ${pct(day.value)}%"></span>
        </div>
      `;
    })
    .join("");

  const labels = days.map((day) => `<span class="${day.isToday ? "is-today" : ""}">${escapeHTML(day.label)}</span>`).join("");
  const described = days
    .map((day) => `<li>${escapeHTML(day.name)}: ${day.isFuture ? "todavía no" : `${day.value} ${escapeHTML(unit)}`}</li>`)
    .join("");

  return `
    <div class="bars">
      <div class="bars__plot" aria-hidden="true" style="--goal: ${pct(goal)}%">
        ${goal ? `<span class="bars__goal"></span>` : ""}
        ${columns}
      </div>
      <div class="bars__labels" aria-hidden="true">${labels}</div>
      ${goal
        ? `<p class="bars__legend" aria-hidden="true"><span class="bars__legend-line"></span>${escapeHTML(goalLabel)} · ${goal} ${escapeHTML(unit)}</p>`
        : ""}
      <ul class="visually-hidden">${described}</ul>
    </div>
  `;
}
