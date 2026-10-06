/* ============================================
   Components — Dot Calendar
   ============================================ */

// Calendario de puntos (como "Workouts" de openGym, escrito desde cero):
// una columna por semana, una fila por día, el mes arriba cuando cambia.
// Punto grande = día con actividad, naranja = hoy.
//
//   dotCalendar(activityGrid(rows, today, 12))   // ver utils/workouts.js
//
// Es decorativo (aria-hidden): la vista pone al lado el total en texto.

import { fromDateKey } from "../../utils/dates.js";

const MONTH_SHORT = new Intl.DateTimeFormat("es-AR", { month: "short" });

export function dotCalendar(grid) {
  let lastMonth = null;
  const months = grid
    .map((week) => {
      const date = fromDateKey(week[0].key);
      const label = date.getMonth() !== lastMonth ? MONTH_SHORT.format(date).replace(".", "") : "";
      lastMonth = date.getMonth();
      return `<span>${label}</span>`;
    })
    .join("");

  const dots = grid
    .flat()
    .map((day) => {
      const classes = ["dots__dot", day.active && "is-active", day.isToday && "is-today", day.isFuture && "is-future"]
        .filter(Boolean)
        .join(" ");
      return `<span class="${classes}"></span>`;
    })
    .join("");

  return `
    <div class="dots" aria-hidden="true" style="--weeks: ${grid.length}">
      <div class="dots__months">${months}</div>
      <div class="dots__grid">${dots}</div>
    </div>
  `;
}
