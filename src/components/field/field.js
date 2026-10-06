/* ============================================
   Components — Field
   ============================================ */

// Campo con label.
//
//   field({ id: "perfil-name", label: "Nombre", value: "Nico" })
//   field({ id: "water", label: "Vasos por día", type: "number", value: 8,
//           attrs: { min: 1, max: 20, step: 1 }, suffix: "vasos" })
//
// `hint` es un texto de ayuda debajo; el mensaje de error se muestra con
// setFieldError(input, "mensaje").

import { escapeHTML } from "../../utils/html.js";

export function field({
  id,
  label,
  value = "",
  type = "text",
  placeholder = "",
  autocomplete = "off",
  hint = "",
  suffix = "",
  attrs = {},
}) {
  const extra = Object.entries(attrs)
    .map(([key, val]) => (val === true ? ` ${escapeHTML(key)}` : ` ${escapeHTML(key)}="${escapeHTML(val)}"`))
    .join("");
  // Los números abren el teclado numérico (attrs.inputmode: "decimal" para tener coma)
  const inputmode = type === "number" && !attrs.inputmode ? ' inputmode="numeric"' : "";
  const describedBy = [hint && `${id}-hint`, `${id}-error`].filter(Boolean).join(" ");

  return `
    <div class="field">
      <label class="field__label" for="${escapeHTML(id)}">${escapeHTML(label)}</label>
      <div class="field__control">
        <input
          class="field__input"
          id="${escapeHTML(id)}"
          name="${escapeHTML(id)}"
          type="${escapeHTML(type)}"
          value="${escapeHTML(value)}"
          placeholder="${escapeHTML(placeholder)}"
          autocomplete="${escapeHTML(autocomplete)}"
          aria-describedby="${escapeHTML(describedBy)}"${inputmode}${extra}
        />
        ${suffix ? `<span class="field__suffix" aria-hidden="true">${escapeHTML(suffix)}</span>` : ""}
      </div>
      ${hint ? `<p class="field__hint" id="${escapeHTML(id)}-hint">${escapeHTML(hint)}</p>` : ""}
      <p class="field__error" id="${escapeHTML(id)}-error" hidden></p>
    </div>
  `;
}

// Muestra (o limpia, con "") el error de un campo
export function setFieldError(input, message) {
  const error = document.getElementById(`${input.id}-error`);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (!error) return;
  error.textContent = message;
  error.hidden = !message;
}
