/* ============================================
   Views — Fitness Exercise Detail
   ============================================ */

// Hoja con el historial de un ejercicio: la animación de cómo se hace,
// mejor marca, último peso y cada sesión con sus series hechas.
//
//   openExerciseDetail(ejercicio, sesiones)

import { bestSet, lastWeight, exerciseHistory } from "../../utils/strength.js";
import { todayKey } from "../../utils/dates.js";
import { escapeHTML } from "../../utils/html.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { exerciseMedia } from "../../components/exercise-media/exercise-media.js";
import { dayLabel, formatKg, setsLine } from "./format.js";

export function openExerciseDetail(exercise, sesiones) {
  const today = todayKey();
  const best = bestSet(sesiones, exercise.nombre);
  const last = lastWeight(sesiones, exercise.nombre);
  const history = exerciseHistory(sesiones, exercise.nombre);

  const figure = (label, set) => `
    <div class="fuerza-figure">
      <p class="label">${label}</p>
      <p><span class="num num--sm">${set ? formatKg(set.peso) : "—"}</span>${set ? ` <span class="label">kg × ${set.reps}</span>` : ""}</p>
    </div>
  `;

  openSheet({
    title: exercise.nombre,
    body: `
      <div class="fuerza-form">
        ${exerciseMedia(exercise.nombre, { size: "lg" })}
        <p class="label">${escapeHTML(exercise.grupo)} · ${escapeHTML(exercise.equipo)}</p>
        <div class="fuerza-figures">
          ${figure("Mejor marca", best)}
          ${figure("Última vez", last)}
        </div>
        ${history.length
          ? `<ul class="list">${history
              .map(
                (h) => `
                  <li class="list-row">
                    <span class="list-row__body">
                      <span class="list-row__title">${escapeHTML(dayLabel(h.fecha, today))} · ${escapeHTML(h.rutina)}</span>
                      <span class="list-row__detail">${escapeHTML(setsLine(h.series))}</span>
                    </span>
                  </li>
                `,
              )
              .join("")}</ul>`
          : `<p class="card__text">Todavía no hiciste este ejercicio.</p>`}
      </div>
    `,
  });
}
