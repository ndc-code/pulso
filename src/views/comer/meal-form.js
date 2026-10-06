/* ============================================
   Views — Meal Form
   ============================================ */

// Hoja "Registrar comida" (spec 4.3): momento, chips de calidad, día y nota.
// Se abre desde Comer y desde Hoy (+ Comida y el + de "Verdura en 2 comidas").
// La foto queda para la Fase 5 (localStorage no alcanza para imágenes).
//
//   openMealForm()

import { add } from "../../store/store.js";
import { SLOTS, POSITIVE_TAGS, MODERATE_TAGS, defaultSlot } from "../../utils/meals.js";
import { todayKey } from "../../utils/dates.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { chipGroup } from "../../components/chip/chip.js";
import { field, setFieldError } from "../../components/field/field.js";
import { toast } from "../../components/toast/toast.js";

export function openMealForm() {
  const body = `
    <form class="meal-form" novalidate>
      ${chipGroup({ name: "slot", legend: "Momento", type: "radio", values: [defaultSlot(new Date().getHours())], options: SLOTS })}

      <div class="meal-form__tags">
        ${chipGroup({ name: "tags", legend: "Sumó", type: "checkbox", options: POSITIVE_TAGS })}
        ${chipGroup({ name: "tags", legend: "A moderar", type: "checkbox", options: MODERATE_TAGS })}
        <p class="field__error" id="meal-tags-error" hidden></p>
      </div>

      ${field({ id: "meal-date", label: "Día", type: "date", value: todayKey(), attrs: { max: todayKey(), required: true } })}
      ${field({ id: "meal-note", label: "Nota (opcional)", placeholder: "Ej: ensalada con lentejas", attrs: { maxlength: 120 } })}

      <div class="sheet__actions">
        <button class="btn btn--primary" type="submit">Guardar comida</button>
      </div>
    </form>
  `;

  const sheet = openSheet({ title: "Registrar comida", body });
  const form = sheet.element.querySelector("form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const tags = [...form.querySelectorAll('[name="tags"]:checked')].map((input) => input.value);
    const dateInput = form.querySelector("#meal-date");
    const date = dateInput.value;
    const tagsError = form.querySelector("#meal-tags-error");

    // Sin chips no hay puntaje: se pide al menos uno
    tagsError.textContent = tags.length ? "" : "Elegí al menos un chip.";
    tagsError.hidden = tags.length > 0;

    const dateOk = date && date <= todayKey();
    setFieldError(dateInput, dateOk ? "" : "Elegí un día de hoy para atrás.");

    if (!tags.length) {
      form.querySelector('[name="tags"]').focus();
      return;
    }
    if (!dateOk) {
      dateInput.focus();
      return;
    }

    await add("meal", {
      date,
      slot: form.querySelector('[name="slot"]:checked').value,
      tags,
      note: form.querySelector("#meal-note").value.trim(),
      photo: null,
    });

    toast("Comida guardada");
    sheet.close();
  });
}
