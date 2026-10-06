/* ============================================
   Components — Chip
   ============================================ */

// Grupo de chips. type "checkbox" (varios) o "radio" (uno).
//
//   chipGroup({
//     name: "days", legend: "Días", type: "checkbox",
//     values: [1, 2, 3],
//     options: [{ value: 1, label: "L", ariaLabel: "lunes" }, ...],
//   })

import { escapeHTML } from "../../utils/html.js";

export function chipGroup({ name, legend, options, values = [], type = "checkbox", legendHidden = false }) {
  const selected = new Set(values.map(String));

  const items = options
    .map((option) => {
      const aria = option.ariaLabel ? ` aria-label="${escapeHTML(option.ariaLabel)}"` : "";
      return `
        <label class="chip">
          <input class="visually-hidden" type="${type}" name="${escapeHTML(name)}"
            value="${escapeHTML(option.value)}"${aria}
            ${selected.has(String(option.value)) ? "checked" : ""} />
          <span aria-hidden="${option.ariaLabel ? "true" : "false"}">${escapeHTML(option.label)}</span>
        </label>
      `;
    })
    .join("");

  return `
    <fieldset class="chip-group">
      <legend class="chip-group__legend${legendHidden ? " visually-hidden" : ""}">${escapeHTML(legend)}</legend>
      <div class="chip-group__list">${items}</div>
    </fieldset>
  `;
}
