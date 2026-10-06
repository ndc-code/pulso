/* ============================================
   Components — Week Strip
   ============================================ */

// Tira de la semana (lunes a domingo): un bloque por día con la letra,
// el número y un punto debajo. La usan Hoy, Ritmo y Fuerza, así se ven iguales.
//
//   weekStrip([
//     { key, weekday, dayNumber,
//       highlighted,   // bloque naranja (Hoy: hoy · Ritmo: el día elegido)
//       isToday, isFuture,
//       level,         // punto: "full" lleno · "partial" aro · "none" nada
//       label },       // texto para lectores de pantalla ("lunes 5: 3 de 6 hábitos")
//   ], { selectable: true })
// Con `selectable`, cada día es un botón con data-day="AAAA-MM-DD" y aria-pressed;
// la vista escucha los clicks. Los días futuros quedan deshabilitados.

import { WEEKDAY_SHORT } from "../../utils/dates.js";
import { escapeHTML } from "../../utils/html.js";

export function weekStrip(days, { selectable = false } = {}) {
  return `<ol class="week-strip">${days.map((day) => item(day, selectable)).join("")}</ol>`;
}

function item(day, selectable) {
  const classes = [
    "week-strip__day",
    day.highlighted && "is-highlighted",
    day.isToday && "is-today",
    day.isFuture && "is-future",
  ].filter(Boolean).join(" ");

  const inner = `
    <span class="week-strip__letter" aria-hidden="true">${WEEKDAY_SHORT[day.weekday]}</span>
    <span class="week-strip__number" aria-hidden="true">${day.dayNumber}</span>
    <span class="week-strip__dot" data-level="${day.level ?? "none"}" aria-hidden="true"></span>
    <span class="visually-hidden">${escapeHTML(day.label)}</span>
  `;

  if (!selectable) {
    return `<li class="${classes}"${day.isToday ? ' aria-current="date"' : ""}>${inner}</li>`;
  }

  return `
    <li>
      <button class="${classes}" type="button" data-day="${day.key}"
        aria-pressed="${Boolean(day.highlighted)}" ${day.isFuture ? "disabled" : ""}>${inner}</button>
    </li>
  `;
}
