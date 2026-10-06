/* ============================================
   Views — Fitness Exercise Form
   ============================================ */

// Hoja "Crear ejercicio": nombre, grupo muscular y equipo.
// Se guarda en el store ("ejercicio") y aparece en la biblioteca.
//
//   openExerciseForm()

import { addCustomExercise } from "../../store/strength.js";
import { GROUPS, EQUIPMENT } from "../../content/exercises.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field, setFieldError } from "../../components/field/field.js";
import { chipGroup } from "../../components/chip/chip.js";
import { toast } from "../../components/toast/toast.js";

export function openExerciseForm() {
  const sheet = openSheet({
    title: "Crear ejercicio",
    body: `
      <form class="fuerza-form" novalidate>
        ${field({ id: "exercise-name", label: "Nombre", placeholder: "Ej: Remo en máquina", attrs: { maxlength: 60, required: true } })}
        ${chipGroup({ name: "grupo", legend: "Grupo muscular", type: "radio", values: [GROUPS[0]], options: GROUPS.map((g) => ({ value: g, label: g })) })}
        ${chipGroup({ name: "equipo", legend: "Equipo", type: "radio", values: [EQUIPMENT[0]], options: EQUIPMENT.map((e) => ({ value: e, label: e })) })}
        <div class="sheet__actions">
          <button class="btn btn--primary" type="submit">Crear ejercicio</button>
        </div>
      </form>
    `,
  });

  const form = sheet.element.querySelector("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.querySelector("#exercise-name");
    const nombre = input.value.trim();

    setFieldError(input, nombre ? "" : "Escribí un nombre.");
    if (!nombre) {
      input.focus();
      return;
    }

    await addCustomExercise({
      nombre,
      grupo: form.querySelector('[name="grupo"]:checked').value,
      equipo: form.querySelector('[name="equipo"]:checked').value,
    });
    toast("Ejercicio creado");
    sheet.close();
  });
}
