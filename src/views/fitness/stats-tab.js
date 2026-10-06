/* ============================================
   Views — Fitness Stats Tab
   ============================================ */

// Fuerza → Progreso (como "Stats" de openGym, en filas tipográficas):
//   1. entrenamientos en total, este mes, racha y volumen de la semana
//   2. calendario de puntos de las últimas 12 semanas
//   3. mejores marcas por ejercicio
//   4. historial de entrenamientos (con borrar)

import { weekStreak, weekVolume, bestSet, sessionStats } from "../../utils/strength.js";
import { activityGrid } from "../../utils/workouts.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { statRow } from "../../components/stat-row/stat-row.js";
import { dotCalendar } from "../../components/dot-calendar/dot-calendar.js";
import { dayLabel, formatKg, setsLine } from "./format.js";

const GRID_WEEKS = 12;
const HISTORY_LIMIT = 12;

export function html({ today, goals, sesiones }) {
  if (!sesiones.length) {
    return `
      <section class="card">
        <h2 class="card__title">Todavía sin entrenamientos</h2>
        <p class="card__text">Cuando termines el primero, acá vas a ver tus totales, tu racha y tus mejores marcas.</p>
      </section>
    `;
  }

  const month = today.slice(0, 7); // "2026-10"
  const thisMonth = new Set(sesiones.filter((s) => s.fecha.startsWith(month)).map((s) => s.fecha)).size;
  const streak = weekStreak(sesiones, today, goals.fuerzaDiasSemana);
  const grid = activityGrid(sesiones.map((s) => ({ date: s.fecha })), today, GRID_WEEKS);
  const activeDays = grid.flat().filter((d) => d.active).length;

  return `
    <section class="stat-rows content-reveal-stagger" aria-label="Totales">
      ${statRow({ value: sesiones.length, size: "xl", copy: [sesiones.length === 1 ? "entrenamiento" : "entrenamientos", "en total."] })}
      ${statRow({ value: thisMonth, copy: [thisMonth === 1 ? "día este mes." : "días este mes."] })}
      ${statRow({ value: streak, copy: [streak === 1 ? "semana seguida" : "semanas seguidas", "cumpliendo tu objetivo."] })}
      ${statRow({ value: formatKg(weekVolume(sesiones, today)), unit: "kg", copy: ["levantados esta semana.", "Peso × reps de las series hechas."] })}
    </section>

    <section class="card content-reveal-position-sm" aria-labelledby="fuerza-grid-title">
      <div class="card__header">
        <h2 class="eyebrow" id="fuerza-grid-title">Últimas ${GRID_WEEKS} semanas</h2>
        <p class="label">${activeDays} ${activeDays === 1 ? "día" : "días"} con pesas</p>
      </div>
      ${dotCalendar(grid)}
    </section>

    <section class="card card--flush content-reveal-position-sm" aria-labelledby="fuerza-best-title">
      <h2 class="card__title" id="fuerza-best-title">Mejores marcas</h2>
      ${bestMarks(sesiones, today)}
    </section>

    <section class="card card--flush" aria-labelledby="fuerza-history-title">
      <h2 class="card__title" id="fuerza-history-title" tabindex="-1">Historial</h2>
      <ul class="list">${[...sesiones]
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
        .slice(0, HISTORY_LIMIT)
        .map((s) => sessionRow(s, today))
        .join("")}</ul>
    </section>
  `;
}

// La serie más pesada de cada ejercicio que se entrenó, de mayor a menor peso
function bestMarks(sesiones, today) {
  const names = [...new Set(sesiones.flatMap((s) => s.ejercicios.map((e) => e.nombre)))];
  const marks = names
    .map((nombre) => ({ nombre, best: bestSet(sesiones, nombre) }))
    .filter((m) => m.best && m.best.peso > 0)
    .sort((a, b) => b.best.peso - a.best.peso);

  if (!marks.length) return `<p class="card__text">Marcá series con peso para ver tus marcas.</p>`;

  return `
    <ul class="list">
      ${marks
        .map(
          ({ nombre, best }) => `
            <li class="list-row">
              <span class="list-row__body">
                <span class="list-row__title">${escapeHTML(nombre)}</span>
                <span class="list-row__detail">${escapeHTML(dayLabel(best.fecha, today))}</span>
              </span>
              <span class="fuerza-mark"><span class="num num--sm">${formatKg(best.peso)}</span> kg × ${best.reps}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function sessionRow(sesion, today) {
  const stats = sessionStats(sesion);
  const exercises = sesion.ejercicios
    .filter((e) => e.series.some((s) => s.hecha))
    .map((e) => `${e.nombre} ${setsLine(e.series.filter((s) => s.hecha))}`)
    .join(" — ");
  const name = `${sesion.rutina} del ${dayLabel(sesion.fecha, today)}`;

  return `
    <li class="list-row">
      <span class="list-row__body">
        <span class="list-row__title">${escapeHTML(sesion.rutina)}</span>
        <span class="list-row__detail">
          ${escapeHTML(dayLabel(sesion.fecha, today))} · ${sesion.duracionMin} min · ${stats.done} series · ${formatKg(stats.volume)} kg
        </span>
        <span class="list-row__detail fuerza-sets">${escapeHTML(exercises)}</span>
      </span>
      <span class="list-row__actions">
        <button class="btn btn--icon" type="button" data-action="delete-session" data-session-id="${escapeHTML(sesion.id)}"
          aria-label="Borrar ${escapeHTML(name)}">${icon("trash-2")}</button>
      </span>
    </li>
  `;
}
