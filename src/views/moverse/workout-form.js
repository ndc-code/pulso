/* ============================================
   Views — Workout Form
   ============================================ */

// Hoja "Registrar sesión" (spec 4.2): tipo, duración, intensidad, día y nota.
// Se abre desde Moverse y también desde Hoy (+ Entreno y el + de Moverme),
// sin salir de la pantalla.
//
//   openWorkoutForm()                    // día: hoy
//   openWorkoutForm({ date: "2026-10-03" })  // día elegido en Moverse

import { add } from "../../store/store.js";
import { WORKOUT_TYPES, INTENSITIES } from "../../utils/workouts.js";
import { todayKey } from "../../utils/dates.js";
import { icon } from "../../utils/icons.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { chipGroup } from "../../components/chip/chip.js";
import { segmented } from "../../components/segmented/segmented.js";
import { field, setFieldError } from "../../components/field/field.js";
import { toast } from "../../components/toast/toast.js";

const STEP = 5;          // − / + suman o restan 5 minutos
const MIN = 5;
const MAX = 600;
const QUICK = [15, 30, 45, 60];

export function openWorkoutForm({ date: initialDate = todayKey() } = {}) {
  let duration = 30;

  const body = `
    <form class="workout-form" novalidate>
      ${chipGroup({
        name: "type",
        legend: "Tipo",
        type: "radio",
        values: ["cardio"],
        options: WORKOUT_TYPES.map((t) => ({ value: t.value, label: t.label })),
      })}

      <fieldset class="workout-form__duration">
        <legend class="chip-group__legend">Duración</legend>
        <div class="workout-form__stepper">
          <button class="btn btn--icon" type="button" data-step="-1" aria-label="Restar ${STEP} minutos">${icon("minus")}</button>
          <p class="workout-form__value" aria-live="polite">
            <span class="num num--md" data-duration>${duration}</span>
            <span class="label">min</span>
          </p>
          <button class="btn btn--icon" type="button" data-step="1" aria-label="Sumar ${STEP} minutos">${icon("plus")}</button>
        </div>
        <div class="chip-group__list">
          ${QUICK.map((m) => `<button class="chip" type="button" data-quick="${m}">${m} min</button>`).join("")}
        </div>
      </fieldset>

      ${segmented({ name: "intensity", legend: "Intensidad", value: "media", options: INTENSITIES })}

      ${field({ id: "workout-date", label: "Día", type: "date", value: initialDate, attrs: { max: todayKey(), required: true } })}

      ${field({ id: "workout-note", label: "Nota (opcional)", placeholder: "Ej: piernas, 5 km, fútbol con amigos", attrs: { maxlength: 120 } })}

      <div class="sheet__actions">
        <button class="btn btn--primary" type="submit">Guardar sesión</button>
      </div>
    </form>
  `;

  const sheet = openSheet({ title: "Registrar sesión", body });
  const form = sheet.element.querySelector("form");
  const durationEl = form.querySelector("[data-duration]");

  const setDuration = (minutes) => {
    duration = Math.min(MAX, Math.max(MIN, minutes));
    durationEl.textContent = duration;
    form.querySelector('[data-step="-1"]').disabled = duration <= MIN;
  };

  form.addEventListener("click", (event) => {
    const step = event.target.closest("[data-step]");
    const quick = event.target.closest("[data-quick]");
    if (step) setDuration(duration + Number(step.dataset.step) * STEP);
    if (quick) setDuration(Number(quick.dataset.quick));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const dateInput = form.querySelector("#workout-date");
    const date = dateInput.value;

    // la fecha tiene que existir y no ser futura (las claves "AAAA-MM-DD" se comparan como texto)
    if (!date || date > todayKey()) {
      setFieldError(dateInput, "Elegí un día de hoy para atrás.");
      dateInput.focus();
      return;
    }
    setFieldError(dateInput, "");

    await add("workout", {
      date,
      type: form.querySelector('[name="type"]:checked').value,
      duration_min: duration,
      intensity: form.querySelector('[name="intensity"]:checked').value,
      routine_id: null,
      note: form.querySelector("#workout-note").value.trim(),
    });

    toast(`Sesión de ${duration} min guardada`);
    sheet.close();
  });
}
