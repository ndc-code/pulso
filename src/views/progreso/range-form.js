/* ============================================
   Views — Range Form
   ============================================ */

// Hoja "Rangos de referencia" (spec 4.5): el mínimo y el máximo de cada
// indicador, como los indica el laboratorio o el médico. Vacío = sin límite.
//
//   openRangeForm(ranges)   // ranges = { ldl: { low, high }, ... }

import { saveRanges } from "../../store/health.js";
import { LAB_INDICATORS, defaultRanges } from "../../utils/health.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field, setFieldError } from "../../components/field/field.js";
import { toast } from "../../components/toast/toast.js";

export function openRangeForm(ranges) {
  const body = `
    <form class="health-form" novalidate>
      <p class="card__text">Copiá los valores de referencia de tu laboratorio o los que te indicó tu médico. Dejá vacío el que no tenga límite.</p>

      ${LAB_INDICATORS.map((i) => `
        <fieldset class="health-form__range">
          <legend class="chip-group__legend">${i.name} (${i.unit})</legend>
          <div class="health-form__pair">
            ${field({ id: `range-${i.key}-low`, label: "Mínimo", type: "number", value: ranges[i.key]?.low ?? "", attrs: { step: "any", min: 0, inputmode: "decimal", "data-range": i.key, "data-bound": "low" } })}
            ${field({ id: `range-${i.key}-high`, label: "Máximo", type: "number", value: ranges[i.key]?.high ?? "", attrs: { step: "any", min: 0, inputmode: "decimal", "data-range": i.key, "data-bound": "high" } })}
          </div>
        </fieldset>
      `).join("")}

      <div class="sheet__actions">
        <button class="btn btn--ghost" type="button" data-reset>Valores habituales</button>
        <button class="btn btn--primary" type="submit">Guardar rangos</button>
      </div>
    </form>
  `;

  const sheet = openSheet({ title: "Rangos de referencia", body });
  const form = sheet.element.querySelector("form");

  // Vuelve a los rangos de arranque (los de utils/health.js)
  form.querySelector("[data-reset]").addEventListener("click", () => {
    const defaults = defaultRanges();
    form.querySelectorAll("[data-range]").forEach((input) => {
      input.value = defaults[input.dataset.range][input.dataset.bound] ?? "";
      setFieldError(input, "");
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const next = {};
    let firstInvalid = null;

    for (const i of LAB_INDICATORS) {
      const lowInput = form.querySelector(`#range-${i.key}-low`);
      const highInput = form.querySelector(`#range-${i.key}-high`);
      const low = lowInput.value === "" ? null : Number(lowInput.value);
      const high = highInput.value === "" ? null : Number(highInput.value);
      const crossed = low != null && high != null && low >= high;

      setFieldError(highInput, crossed ? "El máximo tiene que ser mayor que el mínimo." : "");
      if (crossed) firstInvalid ??= highInput;
      next[i.key] = { low, high };
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    await saveRanges(next);
    toast("Rangos guardados");
    sheet.close();
  });
}
