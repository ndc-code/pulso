/* ============================================
   Components — Option Grid
   ============================================ */

// Grilla de radios con contenido visual (un ícono, una muestra de color).
//
//   optionGrid({
//     name: "icon", legend: "Ícono", value: "droplet",
//     options: [{ value: "droplet", label: "Gota", html: icon("droplet") }],
//   })
//
// `html` se inserta tal cual: tiene que venir de código propio, nunca del usuario.

import { escapeHTML } from "../../utils/html.js";

export function optionGrid({ name, legend, value, options }) {
  const items = options
    .map(
      (option) => `
        <label class="option-grid__option" title="${escapeHTML(option.label)}">
          <input class="visually-hidden" type="radio" name="${escapeHTML(name)}"
            value="${escapeHTML(option.value)}" aria-label="${escapeHTML(option.label)}"
            ${option.value === value ? "checked" : ""} />
          ${option.html}
        </label>
      `,
    )
    .join("");

  return `
    <fieldset class="option-grid">
      <legend class="option-grid__legend">${escapeHTML(legend)}</legend>
      <div class="option-grid__list">${items}</div>
    </fieldset>
  `;
}
