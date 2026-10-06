/* ============================================
   Views — Habit Form
   ============================================ */

// Hoja para crear o editar un hábito (spec 4.1: nombre, ícono, tipo,
// meta y días de la semana). El color de la spec se guarda pero no se elige:
// la interfaz es blanco, negro y naranja.
//
//   openHabitForm(habit?, onClose?)   sin hábito = nuevo
//
// Los hábitos automáticos (con source) no cambian de tipo, y el agua
// toma su meta de Perfil → Metas, así no hay dos lugares para lo mismo.

import { saveHabit, setArchived } from "../../store/habits.js";
import { HABIT_ICONS, icon } from "../../utils/icons.js";
import { WEEK_ORDER, WEEKDAY_LETTERS, WEEKDAY_NAMES } from "../../utils/dates.js";
import { escapeHTML } from "../../utils/html.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field, setFieldError } from "../../components/field/field.js";
import { segmented } from "../../components/segmented/segmented.js";
import { chipGroup } from "../../components/chip/chip.js";
import { optionGrid } from "../../components/option-grid/option-grid.js";
import { toast } from "../../components/toast/toast.js";

const NEW_HABIT = {
  name: "",
  icon: "heart",
  color: "orange",
  type: "bool",
  target: 1,
  unit: "",
  days: [0, 1, 2, 3, 4, 5, 6],
  source: null,
};

export function openHabitForm(existing = null, onClose) {
  const habit = { ...NEW_HABIT, ...existing };
  const isNew = !existing;
  const isAuto = Boolean(habit.source);
  const targetFromProfile = habit.source === "water";

  const body = `
    <form class="habit-form" novalidate>
      ${field({ id: "habit-name", label: "Nombre", value: habit.name, placeholder: "Ej: Leer 10 minutos", attrs: { maxlength: 40, required: true } })}

      ${optionGrid({
        name: "icon",
        legend: "Ícono",
        value: habit.icon,
        options: HABIT_ICONS.map((name) => ({ value: name, label: name, html: icon(name) })),
      })}

      ${isAuto
        ? `<p class="habit-form__note">Se completa solo desde ${escapeHTML(sourceLabel(habit.source))}, por eso el tipo no se puede cambiar.</p>`
        : segmented({
            name: "type",
            legend: "Tipo",
            value: habit.type,
            options: [
              { value: "bool", label: "Sí / No" },
              { value: "count", label: "Contador" },
            ],
          })}

      <div class="habit-form__count" data-count-fields ${habit.type === "count" ? "" : "hidden"}>
        ${targetFromProfile
          ? `<p class="habit-form__note">La meta de agua se ajusta en Perfil → Metas.</p>`
          : `
            <div class="habit-form__row">
              ${field({ id: "habit-target", label: "Meta por día", type: "number", value: habit.target, attrs: { min: 1, max: 999, step: 1 } })}
              ${field({ id: "habit-unit", label: "Unidad", value: habit.unit, placeholder: "min, vasos, páginas…", attrs: { maxlength: 12, ...(isAuto ? { readonly: true } : {}) } })}
            </div>`}
      </div>

      <div>
        ${chipGroup({
          name: "days",
          legend: "Días",
          type: "checkbox",
          values: habit.days,
          options: WEEK_ORDER.map((day) => ({ value: day, label: WEEKDAY_LETTERS[day], ariaLabel: WEEKDAY_NAMES[day] })),
        })}
        <p class="field__error" id="habit-days-error" hidden></p>
      </div>

      <div class="sheet__actions">
        <button class="btn btn--primary" type="submit">${isNew ? "Crear hábito" : "Guardar"}</button>
        ${isNew ? "" : `<button class="btn btn--ghost" type="button" data-archive>${icon("archive")}Archivar</button>`}
      </div>
    </form>
  `;

  const sheet = openSheet({ title: isNew ? "Nuevo hábito" : "Editar hábito", body, onClose });
  const form = sheet.element.querySelector("form");

  // Mostrar u ocultar meta y unidad según el tipo
  form.addEventListener("change", (event) => {
    if (event.target.name === "type") {
      form.querySelector("[data-count-fields]").hidden = event.target.value !== "count";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = readForm(form, habit);
    if (!data) return;

    await saveHabit({ ...(isNew ? {} : { id: habit.id }), ...data });
    toast(isNew ? "Hábito creado" : "Hábito guardado");
    sheet.close();
  });

  form.querySelector("[data-archive]")?.addEventListener("click", async () => {
    await setArchived(habit.id, true);
    toast("Hábito archivado");
    sheet.close();
  });

  // Foco en el nombre al abrir (en mobile no abre el teclado si ya hay nombre)
  if (isNew) form.querySelector("#habit-name").focus();
}

// Lee y valida el formulario. Devuelve los datos o null si hay errores.
function readForm(form, habit) {
  const nameInput = form.querySelector("#habit-name");
  const name = nameInput.value.trim();
  const type = habit.source ? habit.type : form.querySelector('[name="type"]:checked').value;
  const days = [...form.querySelectorAll('[name="days"]:checked')].map((input) => Number(input.value));
  let valid = true;

  setFieldError(nameInput, name ? "" : "Ponele un nombre.");
  if (!name) valid = false;

  const daysError = form.querySelector("#habit-days-error");
  daysError.textContent = days.length ? "" : "Elegí al menos un día.";
  daysError.hidden = days.length > 0;
  if (!days.length) valid = false;

  let target = 1;
  let unit = "";
  const targetInput = form.querySelector("#habit-target");

  if (type === "count" && targetInput) {
    target = Number(targetInput.value);
    unit = form.querySelector("#habit-unit").value.trim();
    const ok = Number.isInteger(target) && target >= 1 && target <= 999;
    setFieldError(targetInput, ok ? "" : "Tiene que ser un número entre 1 y 999.");
    if (!ok) valid = false;
  } else if (type === "count") {
    // agua: la meta vive en el perfil
    target = habit.target;
    unit = habit.unit;
  }

  if (!valid) {
    form.querySelector('[aria-invalid="true"], [name="days"]')?.focus();
    return null;
  }

  return {
    name,
    icon: form.querySelector('[name="icon"]:checked').value,
    // el color ya no se elige (la UI es blanco, negro y naranja),
    // pero se conserva en los datos: el modelo de la spec lo incluye
    color: habit.color,
    type,
    target,
    unit,
    days,
  };
}

function sourceLabel(source) {
  return {
    workout_minutes: "tus entrenos",
    water: "el contador de agua",
    meal_veggies: "tus comidas",
    sleep: "tu registro de sueño",
    breathing: "la respiración guiada o el check",
  }[source];
}
