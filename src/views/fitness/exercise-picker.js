/* ============================================
   Views — Fitness Exercise Picker
   ============================================ */

// Hoja para elegir un ejercicio de la biblioteca, con buscador.
// La usan el editor de rutinas y el modo entrenamiento ("Agregar ejercicio").
//
//   openExercisePicker({ library, onPick: (ejercicio) => … })

import { escapeHTML } from "../../utils/html.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { field } from "../../components/field/field.js";
import { exerciseMedia } from "../../components/exercise-media/exercise-media.js";

const normalize = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function openExercisePicker({ library, onPick }) {
  const sheet = openSheet({
    title: "Elegir ejercicio",
    body: `
      <div class="fuerza-form">
        ${field({ id: "picker-search", label: "Buscar", type: "search", placeholder: "Ej: remo" })}
        <ul class="list" data-picker-list>
          ${library
            .map(
              (e, i) => `
                <li data-name="${escapeHTML(normalize(e.nombre))}">
                  <button class="list-row list-row__main" type="button" data-pick="${i}">
                    ${exerciseMedia(e.nombre)}
                    <span class="list-row__body">
                      <span class="list-row__title">${escapeHTML(e.nombre)}</span>
                      <span class="list-row__detail">${escapeHTML(e.grupo)} · ${escapeHTML(e.equipo)}</span>
                    </span>
                  </button>
                </li>
              `,
            )
            .join("")}
        </ul>
      </div>
    `,
  });

  const input = sheet.element.querySelector("#picker-search");
  const rows = [...sheet.element.querySelectorAll("[data-picker-list] > li")];
  input.addEventListener("input", () => {
    const query = normalize(input.value.trim());
    rows.forEach((row) => (row.hidden = !row.dataset.name.includes(query)));
  });

  sheet.element.addEventListener("click", (event) => {
    const pick = event.target.closest("[data-pick]");
    if (!pick) return;
    sheet.close();
    onPick(library[Number(pick.dataset.pick)]);
  });
}
