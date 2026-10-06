/* ============================================
   Views — Fitness Routine Picker
   ============================================ */

// Hoja para elegir una rutina de la lista (empezar una, o sumarla a un día del Plan).
//
//   openRoutinePicker({ title, rutinas, onPick: (rutina) => …, onNew: () => … })
//   onNew (opcional) agrega el botón "Nueva rutina".

import { estimateMinutes } from "../../utils/strength.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { openSheet } from "../../components/sheet/sheet.js";

export function openRoutinePicker({ title, rutinas, onPick, onNew }) {
  const items = rutinas
    .map(
      (r) => `
        <li>
          <button class="list-row list-row__main" type="button" data-pick="${escapeHTML(r.id)}">
            <span class="list-row__icon">${icon("dumbbell")}</span>
            <span class="list-row__body">
              <span class="list-row__title">${escapeHTML(r.nombre)}</span>
              <span class="list-row__detail">${r.ejercicios.length} ejercicios · ~${estimateMinutes(r)} min</span>
            </span>
          </button>
        </li>
      `,
    )
    .join("");

  const sheet = openSheet({
    title,
    body: `
      <div class="fuerza-form">
        ${items ? `<ul class="list">${items}</ul>` : `<p class="card__text">No hay más rutinas para elegir.</p>`}
        ${onNew ? `<button class="btn btn--ghost btn--block" type="button" data-new>${icon("plus")}Nueva rutina</button>` : ""}
      </div>
    `,
  });

  sheet.element.addEventListener("click", (event) => {
    const pick = event.target.closest("[data-pick]");
    if (pick) {
      sheet.close();
      onPick(rutinas.find((r) => r.id === pick.dataset.pick));
      return;
    }
    if (event.target.closest("[data-new]")) {
      sheet.close();
      onNew();
    }
  });
}
