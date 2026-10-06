/* ============================================
   Components — Sleep Dial
   ============================================ */

// Adaptado de gauge-ui (MIT) — https://gauge-ui.dev
// (SleepDial de components/examples/health-dashboard.tsx, portado a SVG vanilla)
//
// Reloj de 24 horas con la medianoche arriba: la noche es un solo arco
// de la hora de dormir a la de despertar, aunque cruce las 00.
//
//   sleepDial({ bed: "23:30", wake: "07:15", label: "Dormiste 7 h 45" })
//   sleepDial({ label: "Sin registro" })          // solo el reloj vacío
//
// El color del arco es currentColor (se define desde afuera con `color`).

import { arcPath, polar } from "../gauge/gauge-math.js";
import { escapeHTML } from "../../utils/html.js";

const SIZE = 152;
const WIDTH = 12;
const MIDNIGHT = 180; // ángulo de gauge de las 00 (arriba)

// "07:15" → ángulo de gauge (15° por hora, en sentido horario desde arriba)
function clockAngle(time) {
  const [h, m] = time.split(":").map(Number);
  return MIDNIGHT + (h + m / 60) * 15;
}

export function sleepDial({ bed = null, wake = null, label = "" }) {
  const half = SIZE / 2;
  const radius = (SIZE - WIDTH) / 2;
  const track = arcPath(radius, MIDNIGHT, MIDNIGHT + 360);

  let night = "";
  if (bed && wake) {
    const from = clockAngle(bed);
    let to = clockAngle(wake);
    if (to <= from) to += 360; // cruzó la medianoche
    night = `<path class="sleep-dial__night" d="${arcPath(radius, from, to)}" />`;
  }

  // Una marca por hora, por dentro del track
  const ticks = Array.from({ length: 24 }, (_, hour) => {
    const angle = MIDNIGHT + hour * 15;
    const a = polar(radius - WIDTH / 2 - 4, angle);
    const b = polar(radius - WIDTH / 2 - (hour % 6 === 0 ? 10 : 7), angle);
    return `<line class="sleep-dial__tick" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
  }).join("");

  // 00, 06, 12 y 18
  const labels = [0, 6, 12, 18]
    .map((hour) => {
      const p = polar(radius - WIDTH / 2 - 20, MIDNIGHT + hour * 15);
      return `<text class="sleep-dial__hour" x="${p.x}" y="${p.y}">${String(hour).padStart(2, "0")}</text>`;
    })
    .join("");

  return `
    <svg class="sleep-dial" viewBox="${-half} ${-half} ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}"
      role="img" aria-label="${escapeHTML(label)}" style="--gauge-width: ${WIDTH}px">
      <path class="sleep-dial__track" d="${track}" />
      ${night}
      ${ticks}
      ${labels}
    </svg>
  `;
}
