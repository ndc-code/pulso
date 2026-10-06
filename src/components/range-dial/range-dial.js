/* ============================================
   Components — Range Dial
   ============================================ */

// Adaptado de gauge-ui (MIT) — https://gauge-ui.dev
// (RangeDial de components/examples/health-dashboard.tsx, portado a SVG vanilla)
//
// Medio dial chico: toda la escala como track, el rango de referencia
// marcado encima y un punto en el valor medido.
//
//   rangeDial({ value: 120, scale: [0, 250], range: { low: null, high: 100 }, status: "high", label: "LDL 120" })
//
// status "in" → punto naranja lleno · "high"/"low" → aro naranja · null → sin punto.
// Siempre va acompañado del estado en palabras (es decorativo para el color).

import { arcPath, polar, valueToAngle } from "../gauge/gauge-math.js";
import { escapeHTML } from "../../utils/html.js";

const SIZE = 104;
const WIDTH = 8;
const START = 90;  // izquierda
const END = 270;   // derecha: medio círculo abierto abajo
const DOT = 6;

export function rangeDial({ value = null, scale: [min, max], range = {}, status = null, label = "" }) {
  const half = SIZE / 2;
  const radius = half - WIDTH / 2 - DOT;
  const angle = (v) => valueToAngle(v, min, max, START, END);

  const band = arcPath(radius, angle(range.low ?? min), angle(range.high ?? max));
  const dot = value != null && status ? polar(radius, angle(value)) : null;
  const height = half + DOT + 2;

  return `
    <svg class="range-dial" viewBox="${-half} ${-half} ${SIZE} ${height}" width="${SIZE}" height="${height}"
      role="img" aria-label="${escapeHTML(label)}" style="--gauge-width: ${WIDTH}px">
      <path class="range-dial__track" d="${arcPath(radius, START, END)}" />
      ${band ? `<path class="range-dial__band" d="${band}" />` : ""}
      ${dot ? `<circle class="range-dial__dot" data-status="${escapeHTML(status)}" cx="${dot.x}" cy="${dot.y}" r="${DOT}" />` : ""}
    </svg>
  `;
}
