/* ============================================
   Components — Segmented
   ============================================ */

// Selector de opciones excluyentes.
//
//   segmented({
//     name: "theme",
//     legend: "Tema",
//     value: "system",
//     options: [{ value: "system", label: "Sistema" }, ...],
//   })
//
// Para leer el cambio: escuchar "change" en el contenedor y mirar event.target.value

import { escapeHTML } from "../../utils/html.js";

export function segmented({ name, legend, value, options }) {
  const items = options
    .map(
      (option) => `
        <label class="segmented__option">
          <input
            class="visually-hidden"
            type="radio"
            name="${escapeHTML(name)}"
            value="${escapeHTML(option.value)}"
            ${option.value === value ? "checked" : ""}
          />
          <span>${escapeHTML(option.label)}</span>
        </label>
      `,
    )
    .join("");

  return `
    <fieldset class="segmented">
      <legend class="segmented__legend">${escapeHTML(legend)}</legend>
      <div class="segmented__track">${items}</div>
    </fieldset>
  `;
}
