/* ============================================
   Components — Stat Row
   ============================================ */

// Fila tipográfica (referencia "55% · Entertainment purposes"):
// número grande a la izquierda, copy chico a la derecha, línea fina arriba.
// Varias filas seguidas arman el resumen de una sección.
//
//   statRow({
//     value: 50, unit: "min",
//     copy: ["minutos esta semana.", "De 150 recomendados."],   // líneas de texto
//     size: "xl",                     // "lg" (default) | "xl"
//     bar: 33,                        // opcional: barra de progreso naranja (0–100)
//     extra: "<button>…</button>",    // opcional: HTML propio debajo del copy
//   })
//
// `extra` se inserta tal cual: tiene que venir de código propio, nunca del usuario.

import { escapeHTML } from "../../utils/html.js";

export function statRow({ value, unit = "", copy = [], size = "lg", bar = null, extra = "" }) {
  const lines = copy.map((line) => escapeHTML(line)).join("<br />");
  const progress = bar === null
    ? ""
    : `<span class="stat-row__bar" aria-hidden="true"><span style="width: ${Math.min(100, Math.max(0, Number(bar)))}%"></span></span>`;

  return `
    <div class="stat-row">
      <p class="stat-row__value">
        <span class="num num--${escapeHTML(size)}">${escapeHTML(value)}</span>
        ${unit ? `<span class="stat-row__unit">${escapeHTML(unit)}</span>` : ""}
      </p>
      <div class="stat-row__copy">
        <p class="label">${lines}</p>
        ${extra}
      </div>
      ${progress}
    </div>
  `;
}
