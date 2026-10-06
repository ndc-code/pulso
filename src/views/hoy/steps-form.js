/* ============================================
   Views — Steps Form
   ============================================ */

// Hoja "Pasos de hoy": el total de pasos del día, para el hábito Ritmo.
// Por ahora se escribe a mano (copiado de Salud en el iPhone); cuando exista
// la importación desde Salud, esta hoja se reemplaza sin tocar el hábito.
// Se guarda el total, no se suma: si ya había un número, se pisa.
//
//   openStepsForm({ steps: 5200 })   // el valor con el que arranca

import { setSteps } from "../../store/habits.js";
import { todayKey } from "../../utils/dates.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field, setFieldError } from "../../components/field/field.js";
import { toast } from "../../components/toast/toast.js";

const MAX = 100000;

export function openStepsForm({ steps = 0 } = {}) {
  const body = `
    <form class="steps-form" novalidate>
      ${field({
        id: "steps-total",
        label: "Pasos de hoy",
        type: "number",
        value: steps || "",
        suffix: "pasos",
        hint: "El total del día, como lo muestra Salud.",
        attrs: { min: 0, max: MAX, step: 1, inputmode: "numeric", required: true },
      })}
      <div class="sheet__actions">
        <button class="btn btn--primary" type="submit">Guardar</button>
      </div>
    </form>
  `;

  const sheet = openSheet({ title: "Registrar pasos", body });
  const form = sheet.element.querySelector("form");
  const input = form.querySelector("#steps-total");
  input.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = Number(input.value);
    const ok = input.value !== "" && Number.isInteger(value) && value >= 0 && value <= MAX;

    setFieldError(input, ok ? "" : `Un número entero entre 0 y ${MAX.toLocaleString("es-AR")}.`);
    if (!ok) {
      input.focus();
      return;
    }

    await setSteps(todayKey(), value);
    toast(`${value.toLocaleString("es-AR")} pasos guardados`);
    sheet.close();
  });
}
