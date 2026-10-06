/* ============================================
   Views — Fitness Routine Form
   ============================================ */

// Hoja "Nueva rutina" / "Editar rutina": nombre, días de la semana y
// ejercicios (cada uno con series, reps y descanso en segundos).
// "Agregar ejercicio" abre la biblioteca encima (exercise-picker.js).
//
//   openRoutineForm({ library })                       // nueva
//   openRoutineForm({ library, dias: [1] })            // nueva, ya con el lunes marcado
//   openRoutineForm({ library, rutina })               // editar

import { saveRoutine, deleteRoutine } from "../../store/strength.js";
import { WEEK_ORDER, WEEKDAY_LETTERS, WEEKDAY_NAMES } from "../../utils/dates.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field, setFieldError } from "../../components/field/field.js";
import { chipGroup } from "../../components/chip/chip.js";
import { toast } from "../../components/toast/toast.js";
import { openExercisePicker } from "./exercise-picker.js";

// Valores para un ejercicio recién agregado
const NEW_EXERCISE = { series: 3, reps: 10, descansoSeg: 90 };

export function openRoutineForm({ library, rutina = null, dias = [] }) {
  // Copia de trabajo: no toca el store hasta "Guardar"
  const draft = structuredClone(rutina ?? { nombre: "", dias, ejercicios: [] });

  const sheet = openSheet({
    title: rutina ? "Editar rutina" : "Nueva rutina",
    body: `
      <form class="fuerza-form" novalidate>
        ${field({ id: "routine-name", label: "Nombre", value: draft.nombre, placeholder: "Ej: Piernas", attrs: { maxlength: 40, required: true } })}
        ${chipGroup({
          name: "dias",
          legend: "Días",
          type: "checkbox",
          values: draft.dias,
          options: WEEK_ORDER.map((d) => ({ value: d, label: WEEKDAY_LETTERS[d], ariaLabel: WEEKDAY_NAMES[d] })),
        })}
        <fieldset class="routine-exercises">
          <legend class="chip-group__legend">Ejercicios</legend>
          <ul class="routine-exercises__list" data-exercises></ul>
          <p class="field__error" id="routine-exercises-error" hidden></p>
          <button class="btn btn--ghost btn--block" type="button" data-add>${icon("plus")}Agregar ejercicio</button>
        </fieldset>
        <div class="sheet__actions">
          ${rutina ? `<button class="btn btn--text routine-delete" type="button" data-delete>Borrar rutina</button>` : ""}
          <button class="btn btn--primary" type="submit">Guardar rutina</button>
        </div>
      </form>
    `,
  });

  const form = sheet.element.querySelector("form");
  const list = form.querySelector("[data-exercises]");

  // La lista se repinta entera al agregar o sacar; los números se guardan al escribir
  function paintExercises(focusSelector = null) {
    list.innerHTML = draft.ejercicios
      .map(
        (e, i) => `
          <li class="routine-exercise" data-i="${i}">
            <div class="routine-exercise__head">
              <p class="routine-exercise__name">${escapeHTML(e.nombre)}</p>
              <button class="btn btn--icon" type="button" data-remove aria-label="Sacar ${escapeHTML(e.nombre)}">${icon("x")}</button>
            </div>
            <div class="routine-exercise__numbers">
              ${numberInput("series", "Series", e.series, e.nombre)}
              ${numberInput("reps", "Reps", e.reps, e.nombre)}
              ${numberInput("descansoSeg", "Descanso (s)", e.descansoSeg, e.nombre, 15)}
            </div>
          </li>
        `,
      )
      .join("");
    if (focusSelector) form.querySelector(focusSelector)?.focus();
  }
  paintExercises();

  form.addEventListener("input", (event) => {
    const input = event.target.closest("[data-key]");
    if (!input) return;
    const value = Math.round(Number(input.value));
    draft.ejercicios[Number(input.closest("[data-i]").dataset.i)][input.dataset.key] = value > 0 ? value : 1;
  });

  form.addEventListener("click", async (event) => {
    if (event.target.closest("[data-add]")) {
      openExercisePicker({
        library,
        onPick: (picked) => {
          draft.ejercicios.push({ nombre: picked.nombre, ...NEW_EXERCISE });
          paintExercises(`[data-i="${draft.ejercicios.length - 1}"] [data-key="series"]`);
        },
      });
      return;
    }

    const remove = event.target.closest("[data-remove]");
    if (remove) {
      draft.ejercicios.splice(Number(remove.closest("[data-i]").dataset.i), 1);
      paintExercises("[data-add]");
      return;
    }

    if (event.target.closest("[data-delete]")) {
      if (!confirm(`¿Borrar la rutina "${rutina.nombre}"? Los entrenamientos que ya hiciste no se borran.`)) return;
      await deleteRoutine(rutina.id);
      toast("Rutina borrada");
      sheet.close();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nameInput = form.querySelector("#routine-name");
    const errorEl = form.querySelector("#routine-exercises-error");
    draft.nombre = nameInput.value.trim();
    draft.dias = [...form.querySelectorAll('[name="dias"]:checked')].map((input) => Number(input.value));

    setFieldError(nameInput, draft.nombre ? "" : "Ponele un nombre.");
    errorEl.textContent = draft.ejercicios.length ? "" : "Agregá al menos un ejercicio.";
    errorEl.hidden = draft.ejercicios.length > 0;

    if (!draft.nombre) {
      nameInput.focus();
      return;
    }
    if (!draft.ejercicios.length) {
      form.querySelector("[data-add]").focus();
      return;
    }

    await saveRoutine(draft);
    toast(rutina ? "Rutina guardada" : "Rutina creada");
    sheet.close();
  });
}

// Campo numérico chico de la fila de un ejercicio
function numberInput(key, label, value, exerciseName, step = 1) {
  return `
    <label class="routine-number">
      <span class="routine-number__label">${label}</span>
      <input class="sets__input" type="number" inputmode="numeric" min="1" step="${step}" value="${value}"
        data-key="${key}" aria-label="${escapeHTML(label)} de ${escapeHTML(exerciseName)}" />
    </label>
  `;
}
