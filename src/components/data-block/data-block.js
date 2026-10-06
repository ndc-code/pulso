/* ============================================
   Components — Data Block
   ============================================ */

// Bloque de dato, como la referencia "143 ha":
// el texto arriba y el número protagonista abajo, con la unidad en chico al lado.
//
//   dataBlock({
//     tone: "accent",                  // "accent" | "strong" | "soft"
//     label: "Actividad física",
//     text: "Moderada, como mínimo. Hasta 300 min suma más.",
//     value: "150", unit: "min por semana",
//     index: 0,                        // posición en una .block-stack
//   })

import { escapeHTML } from "../../utils/html.js";

export function dataBlock({ tone = "soft", label, text = "", value, unit = "", index = 0, size = "lg" }) {
  return `
    <article class="data-block data-block--${escapeHTML(tone)}" style="--i: ${Number(index)}">
      <div class="data-block__copy">
        <p class="data-block__label">${escapeHTML(label)}</p>
        ${text ? `<p class="data-block__text">${escapeHTML(text)}</p>` : ""}
      </div>
      <p class="data-block__value">
        <span class="num num--${escapeHTML(size)}">${escapeHTML(value)}</span>
        ${unit ? `<span class="data-block__unit">${escapeHTML(unit)}</span>` : ""}
      </p>
    </article>
  `;
}
