/* ============================================
   Views — Body Form
   ============================================ */

// Hoja "Registrar peso" (spec 4.5): peso, día y la meta de peso (opcional).
// Un registro por día: si ese día ya tiene uno, se pisa.
// La meta se guarda en el perfil (profile.weight_goal); vacía = sin meta.
//
//   openBodyForm({ weight: 79.9, goal: 77 })   // valores con los que arranca

import { get, set } from "../../store/store.js";
import { saveBody } from "../../store/health.js";
import { todayKey } from "../../utils/dates.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field, setFieldError } from "../../components/field/field.js";
import { toast } from "../../components/toast/toast.js";

const WEIGHT = { min: 20, max: 400 };

export function openBodyForm({ weight = "", goal = "" } = {}) {
  const weightAttrs = { step: 0.1, min: WEIGHT.min, max: WEIGHT.max, inputmode: "decimal" };

  const body = `
    <form class="body-form" novalidate>
      <div class="body-form__pair">
        ${field({ id: "body-weight", label: "Peso", type: "number", value: weight, suffix: "kg", attrs: { ...weightAttrs, required: true } })}
        ${field({ id: "body-goal", label: "Meta (opcional)", type: "number", value: goal ?? "", suffix: "kg", attrs: weightAttrs })}
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
    const goalInput = form.querySelector("#body-goal");
    const dateInput = form.querySelector("#body-date");

    const weightValue = Number(weightInput.value);
    const goalValue = goalInput.value === "" ? null : Number(goalInput.value);
    const weightError = `Un peso entre ${WEIGHT.min} y ${WEIGHT.max} kg.`;

    const errors = [
      [weightInput, weightInput.value !== "" && inRange(weightValue) ? "" : weightError],
      [goalInput, goalValue === null || inRange(goalValue) ? "" : weightError],
      [dateInput, dateInput.value && dateInput.value <= todayKey() ? "" : "Elegí un día de hoy para atrás."],
    ];
    errors.forEach(([input, message]) => setFieldError(input, message));

    const firstError = errors.find(([, message]) => message);
    if (firstError) {
      firstError[0].focus();
      return;
    }

    const profile = await get("profile");
    if (profile.weight_goal !== goalValue) await set("profile", { ...profile, weight_goal: goalValue });
    // la cintura no se pide acá: se conserva la que hubiera ese día
    const existing = (await get("body")).find((row) => row.date === dateInput.value);
    await saveBody({ date: dateInput.value, weight: weightValue, waist: existing?.waist ?? null });

    toast("Peso guardado");
    sheet.close();
  });
}

const inRange = (value) => Number.isFinite(value) && value >= WEIGHT.min && value <= WEIGHT.max;
