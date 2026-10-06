/* ============================================
   Components — Gauge
   ============================================ */

// Anillo de progreso en SVG (base: gauge-ui, MIT).
//
//   ring({ value: 3, max: 8, size: 56, width: 4, segments: 8, label: "3 de 8 vasos" })
//   ring({ value: 90, max: 150, start: 60, end: 300, ticks: 10 })   // dial abierto abajo (como "Steps")
//
// - El arco se pinta con stroke-dasharray sobre un path de pathLength 100:
//   así el cambio de valor se anima con una transición de CSS.
// - `segments` corta el anillo en partes iguales (un tramo por vaso).
// - `ticks` dibuja marcas cortas por dentro del arco (como el dial de "Steps").
// - Si el arco no da la vuelta completa, el SVG se recorta abajo: no deja
//   espacio vacío debajo de la apertura.
// - El color del arco es currentColor: se define desde afuera con `color`.
// - Para actualizarlo sin volver a pintar: setRing(svg, value, max).

import { arcPath, cutValues, polar, valueToAngle } from "./gauge-math.js";
import { escapeHTML } from "../../utils/html.js";

// Ángulos de gauge: 0 = abajo, crecen en sentido horario.
// Anillo completo que arranca arriba: 180 → 540. Dial abierto abajo: 40 → 320.
const START = 180;
const END = 540;

export function ring({ value, max, size = 120, width = 10, segments = 0, ticks = 0, label = "", className = "", start = START, end = END }) {
  const radius = (size - width) / 2;
  const half = size / 2;
  const track = arcPath(radius, start, end);
  const percent = percentOf(value, max);

  // Alto del dibujo: si el arco está abierto abajo, se corta en sus extremos
  const isOpen = end - start < 360;
  const lowest = Math.max(polar(radius, start).y, polar(radius, end).y) + width / 2 + 1;
  const height = isOpen ? Math.round(half + Math.min(half, lowest)) : size;

  const tickMarks = ticks > 0
    ? Array.from({ length: ticks + 1 }, (_, i) => {
        const angle = start + (i * (end - start)) / ticks;
        const a = polar(radius - width / 2 - 6, angle);
        const b = polar(radius - width / 2 - 11, angle);
        return `<line class="gauge__tick" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
      }).join("")
    : "";

  const cuts = segments > 1
    ? cutValues(0, max, segments)
        .map((v) => {
          const angle = valueToAngle(v, 0, max, start, end);
          const a = polar(radius - width / 2 - 1, angle);
          const b = polar(radius + width / 2 + 1, angle);
          return `<line class="gauge__cut" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
        })
        .join("")
    : "";

  return `
    <svg class="gauge ${className}" viewBox="${-half} ${-half} ${size} ${height}"
      width="${size}" height="${height}" role="img" aria-label="${escapeHTML(label)}"
      style="--gauge-width: ${width}px">
      ${tickMarks}
      <path class="gauge__track" d="${track}" />
      <path class="gauge__arc${percent === 0 ? " is-empty" : ""}" d="${track}" pathLength="100"
        style="stroke-dasharray: ${percent} 100" />
      ${cuts}
    </svg>
  `;
}

// Actualiza un anillo ya pintado (la transición de CSS hace la animación)
export function setRing(svg, value, max, label) {
  const arc = svg.querySelector(".gauge__arc");
  const percent = percentOf(value, max);
  arc.style.strokeDasharray = `${percent} 100`;
  arc.classList.toggle("is-empty", percent === 0);
  if (label) svg.setAttribute("aria-label", label);
}

function percentOf(value, max) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}
