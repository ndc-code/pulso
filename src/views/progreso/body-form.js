/* ============================================
   Views — Body Form
   ============================================ */

// Hoja "Registrar peso" (spec 4.5): día, peso y cintura (opcional).
// Un registro por día: si ese día ya tiene uno, se pisa.
//
//   openBodyForm()

import { saveBody } from "../../store/health.js";
import { todayKey } from "../../utils/dates.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field, setFieldError } from "../../components/field/field.js";
import { toast } from "../../components/toast/toast.js";

const WEIGHT = { min: 20, max: 400 };
const WAIST = { min: 30, max: 250 };

export function openBodyForm({ weight = "", waist = "" } = {}) {
  const body = `
    <form class="health-form" novalidate>
      <div class="health-form__pair">
        ${field({ id: "body-weight", label: "Peso", type: "number", value: weight, suffix: "kg", attrs: { step: 0.1, min: WEIGHT.min, max: WEIGHT.max, inputmode: "decimal", required: true } })}
        ${field({ id: "body-waist", label: "Cintura (opcional)", type: "number", value: waist, suffix: "cm", attrs: { step: 0.5, min: WAIST.min, max: WAIST.max, inputmode: "decimal" } })}
      </div>
      ${field({ id: "body-date", label: "Día", type: "date", value: todayKey(), attrs: { max: todayKey(), required: true } })}
      <p class="card__text">Pesate siempre en las mismas condiciones (por ejemplo, a la mañana y en ayunas) para comparar mejor.</p>
      <div class="sheet__actions">
        <button class="btn btn--primary" type="submit">Guardar</button>
      </div>
    </form>
  `;

  const sheet = openSheet({ title: "Registrar peso", body });
  const form = sheet.element.querySelector("form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const weightInput = form.querySelector("#body-weight");
    const waistInput = form.querySelector("#body-waist");
    const dateInput = form.querySelector("#body-date");

    const weightValue = Number(weightInput.value);
    const waistValue = waistInput.value === "" ? null : Number(waistInput.value);

    const errors = [
      [weightInput, weightInput.value !== "" && inRange(weightValue, WEIGHT) ? "" : `Un peso entre ${WEIGHT.min} y ${WEIGHT.max} kg.`],
      [waistInput, waistValue === null || inRange(waistValue, WAIST) ? "" : `Una medida entre ${WAIST.min} y ${WAIST.max} cm.`],
      [dateInput, dateInput.value && dateInput.value <= todayKey() ? "" : "Elegí un día de hoy para atrás."],
    ];
    errors.forEach(([input, message]) => setFieldError(input, message));

    const firstError = errors.find(([, message]) => message);
    if (firstError) {
      firstError[0].focus();
      return;
    }

    await saveBody({ date: dateInput.value, weight: weightValue, waist: waistValue });
    toast("Peso guardado");
    sheet.close();
  });
}

const inRange = (value, { min, max }) => Number.isFinite(value) && value >= min && value <= max;
