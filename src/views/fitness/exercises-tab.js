/* ============================================
   Views — Fitness Exercises Tab
   ============================================ */

// Fuerza → Ejercicios (como "Exercises" de openGym):
// buscador, filtro por grupo muscular, crear un ejercicio propio y la lista.
// Cada fila muestra la foto, el último peso usado; tocarla abre su historial.
//
// Buscar y filtrar NO repinta la vista: se esconden filas en el lugar,
// así el campo de búsqueda no pierde el foco mientras escribís.

import { lastWeight } from "../../utils/strength.js";
import { GROUPS } from "../../content/exercises.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { field } from "../../components/field/field.js";
import { exerciseMedia } from "../../components/exercise-media/exercise-media.js";
import { chipGroup } from "../../components/chip/chip.js";
import { formatKg } from "./format.js";

// Sin tildes y en minúscula: "Estocadas" se encuentra escribiendo "estocada"
const normalize = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function html({ library, sesiones }) {
  return `
    <section class="fuerza-search content-reveal-position-sm" aria-label="Buscar ejercicios">
      ${field({ id: "fuerza-search", label: "Buscar", type: "search", placeholder: "Ej: sentadilla" })}
      ${chipGroup({
        name: "grupo",
        legend: "Grupo muscular",
        type: "radio",
        values: ["todos"],
        options: [{ value: "todos", label: "Todos" }, ...GROUPS.map((g) => ({ value: g, label: g }))],
      })}
    </section>

    <button class="btn btn--ghost btn--block" type="button" data-action="new-exercise">${icon("plus")}Crear ejercicio</button>

    <section class="card" aria-labelledby="fuerza-library-title">
      <div class="card__header">
        <h2 class="eyebrow" id="fuerza-library-title">Ejercicios</h2>
        <p class="label" data-count aria-live="polite">${library.length}</p>
      </div>
      <ul class="list" data-library>
        ${library.map((e) => exerciseRow(e, sesiones)).join("")}
      </ul>
      <p class="card__text" data-empty hidden>No hay ejercicios con ese nombre.</p>
    </section>
  `;
}

function exerciseRow(exercise, sesiones) {
  const last = lastWeight(sesiones, exercise.nombre);
  return `
    <li data-name="${escapeHTML(normalize(exercise.nombre))}" data-grupo="${escapeHTML(exercise.grupo)}">
      <button class="list-row list-row__main" type="button" data-action="open-exercise" data-name="${escapeHTML(exercise.nombre)}">
        ${exerciseMedia(exercise.nombre)}
        <span class="list-row__body">
          <span class="list-row__title">${escapeHTML(exercise.nombre)}</span>
          <span class="list-row__detail">${escapeHTML(exercise.grupo)} · ${escapeHTML(exercise.equipo)}${exercise.propio ? " · propio" : ""}</span>
        </span>
        ${last ? `<span class="fuerza-last">${formatKg(last.peso)} kg</span>` : ""}
      </button>
    </li>
  `;
}

// Filtro en el lugar: texto + grupo
export function mount(root) {
  const input = root.querySelector("#fuerza-search");
  const rows = [...root.querySelectorAll("[data-library] > li")];
  const count = root.querySelector("[data-count]");
  const empty = root.querySelector("[data-empty]");

  const apply = () => {
    const query = normalize(input.value.trim());
    const grupo = root.querySelector('[name="grupo"]:checked').value;
    let visible = 0;

    rows.forEach((row) => {
      // la fila guarda el nombre ya normalizado en data-name
      const show = row.dataset.name.includes(query) && (grupo === "todos" || row.dataset.grupo === grupo);
      row.hidden = !show;
      if (show) visible++;
    });

    count.textContent = visible;
    empty.hidden = visible > 0;
  };

  input.addEventListener("input", apply);
  root.querySelector(".fuerza-search").addEventListener("change", apply);
}
