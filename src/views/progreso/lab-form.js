/* ============================================
   Views — Lab Form
   ============================================ */

// Hoja "Cargar análisis" (spec 4.5): fecha, LDL, HDL, colesterol total,
// triglicéridos, Lp(a), glucemia y un valor extra opcional (nombre + número).
// Todos los valores son opcionales, pero tiene que haber al menos uno.
//
//   openLabForm()

import { addLabResult } from "../../store/health.js";
import { LAB_INDICATORS } from "../../utils/health.js";
import { todayKey } from "../../utils/dates.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field, setFieldError } from "../../components/field/field.js";
import { toast } from "../../components/toast/toast.js";

const MAX_VALUE = 2000;

export function openLabForm() {
  const body = `
    <form class="health-form" novalidate>
      ${field({ id: "lab-date", label: "Fecha del análisis", type: "date", value: todayKey(), attrs: { max: todayKey(), required: true } })}

      <div class="health-form__grid">
        ${LAB_INDICATORS.map((i) =>
          field({
            id: `lab-${i.key}`,
            label: i.name,
            type: "number",
            suffix: i.unit,
            attrs: { step: "any", min: 0, max: MAX_VALUE, inputmode: "decimal", "data-lab": i.key },
          }),
        ).join("")}
      </div>

      <div class="health-form__pair">
        ${field({ id: "lab-extra-name", label: "Otro valor (opcional)", placeholder: "Ej: TSH", attrs: { maxlength: 40 } })}
        ${field({ id: "lab-extra-value", label: "Resultado", type: "number", attrs: { step: "any", inputmode: "decimal" } })}
      </div>

      <p class="field__error" id="lab-empty-error" hidden></p>

      <div class="sheet__actions">
        <button class="btn btn--primary" type="submit">Guardar análisis</button>
      </div>
    </form>
  `;

  const sheet = openSheet({ title: "Cargar análisis", body });
  const form = sheet.element.querySelector("form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const dateInput = form.querySelector("#lab-date");
    const emptyError = form.querySelector("#lab-empty-error");
    const row = { date: dateInput.value, extra: {} };
    let firstInvalid = null;

    // Cada indicador: vacío = no se midió (null)
    form.querySelectorAll("[data-lab]").forEach((input) => {
      const value = input.value === "" ? null : Number(input.value);
      const ok = value === null || (Number.isFinite(value) && value >= 0 && value <= MAX_VALUE);
      setFieldError(input, ok ? "" : `Un número entre 0 y ${MAX_VALUE}.`);
      if (!ok) firstInvalid ??= input;
      row[input.dataset.lab] = ok ? value : null;
    });

    const extraName = form.querySelector("#lab-extra-name").value.trim();
    const extraValue = form.querySelector("#lab-extra-value").value;
    if (extraName && extraValue !== "") row.extra[extraName] = Number(extraValue);

    const dateOk = dateInput.value && dateInput.value <= todayKey();
    setFieldError(dateInput, dateOk ? "" : "Elegí un día de hoy para atrás.");
    if (!dateOk) firstInvalid ??= dateInput;

    const hasAny = LAB_INDICATORS.some((i) => row[i.key] != null) || Object.keys(row.extra).length > 0;
    emptyError.textContent = hasAny ? "" : "Cargá al menos un valor.";
    emptyError.hidden = hasAny;

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    if (!hasAny) {
      form.querySelector("[data-lab]").focus();
      return;
    }

    await addLabResult(row);
    toast("Análisis guardado");
    sheet.close();
  });
}
