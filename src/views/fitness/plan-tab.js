/* ============================================
   Views — Fitness Plan Tab
   ============================================ */

// Fuerza → Plan (como "Plan · Week schedule" de openGym):
//   1. la semana de lunes a domingo: qué rutina toca cada día,
//      con × para sacarla y + para agregar otra (sin rutina = descanso)
//   2. tus rutinas: tocar una abre el editor; "Nueva" crea otra

import { WEEK_ORDER, WEEKDAY_NAMES } from "../../utils/dates.js";
import { routinesForDay, estimateMinutes } from "../../utils/strength.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { capitalize } from "./format.js";

const SHORT_DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function html({ rutinas }) {
  return `
    <section class="card card--flush content-reveal-position-sm" aria-labelledby="fuerza-plan-title">
      <h2 class="card__title" id="fuerza-plan-title">Tu semana</h2>
      <p class="card__text">Qué rutina toca cada día. Los días sin rutina son de descanso.</p>
      <ul class="plan-week">
        ${WEEK_ORDER.map((day) => planDay(day, routinesForDay(rutinas, day))).join("")}
      </ul>
    </section>

    <section class="card card--flush content-reveal-position-sm" aria-labelledby="fuerza-routines-title">
      <div class="card__header">
        <h2 class="card__title" id="fuerza-routines-title">Rutinas</h2>
        <button class="btn btn--text" type="button" data-action="new-routine">Nueva</button>
      </div>
      ${rutinas.length
        ? `<ul class="list">${rutinas.map(routineRow).join("")}</ul>`
        : `<p class="card__text">Todavía no tenés rutinas. Creá la primera con "Nueva".</p>`}
    </section>
  `;
}

function planDay(day, routines) {
  const name = capitalize(WEEKDAY_NAMES[day]);
  const items = routines
    .map(
      (r) => `
        <li class="plan-day__routine">
          <span class="plan-day__dot" aria-hidden="true"></span>
          <span class="list-row__body">
            <span class="list-row__title">${escapeHTML(r.nombre)}</span>
            <span class="list-row__detail">${r.ejercicios.length} ejercicios · ~${estimateMinutes(r)} min</span>
          </span>
          <button class="btn btn--icon plan-day__remove" type="button" data-action="remove-from-day"
            data-routine-id="${escapeHTML(r.id)}" data-day="${day}"
            aria-label="Sacar ${escapeHTML(r.nombre)} del ${escapeHTML(WEEKDAY_NAMES[day])}">${icon("x")}</button>
        </li>
      `,
    )
    .join("");

  return `
    <li class="plan-day">
      <div class="plan-day__head">
        <h3 class="plan-day__name">${name}</h3>
        ${routines.length ? "" : `<span class="fuerza-tag">Descanso</span>`}
        <button class="btn btn--icon plan-day__add" type="button" data-action="add-to-day" data-day="${day}"
          aria-label="Agregar rutina al ${escapeHTML(WEEKDAY_NAMES[day])}">${icon("plus")}</button>
      </div>
      ${items ? `<ul class="plan-day__list">${items}</ul>` : ""}
    </li>
  `;
}

function routineRow(r) {
  const days = [...r.dias]
    .sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b))
    .map((d) => SHORT_DAYS[d])
    .join(", ");

  return `
    <li>
      <button class="list-row list-row__main" type="button" data-action="edit-routine" data-routine-id="${escapeHTML(r.id)}">
        <span class="list-row__icon">${icon("dumbbell")}</span>
        <span class="list-row__body">
          <span class="list-row__title">${escapeHTML(r.nombre)}</span>
          <span class="list-row__detail">${r.ejercicios.length} ejercicios · ${days || "sin día fijo"} · ~${estimateMinutes(r)} min</span>
        </span>
        ${icon("chevron-left", "list-row__chevron")}
      </button>
    </li>
  `;
}
