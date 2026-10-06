/* ============================================
   Views — Fitness Home Tab
   ============================================ */

// Fuerza → Hoy (como el Home de openGym):
//   1. objetivo de la semana: "2 de 3 días", un punto por día y editar
//   2. la semana: punto lleno = entrenaste · aro = día con rutina en el plan
//   3. la rutina del día con "Empezar" (o elegir otra / entrenamiento libre)
//   4. pérdida de peso: la misma tarjeta que en Pulso (components/weight-card)
//   5. racha de semanas cumpliendo el objetivo y el último entrenamiento

import { weekKeys, weekdayOf, fromDateKey, WEEKDAY_NAMES } from "../../utils/dates.js";
import { weekDays, weekStreak, routinesForDay, estimateMinutes, sessionStats } from "../../utils/strength.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { dotProgress } from "../../components/dot-progress/dot-progress.js";
import { weekStrip } from "../../components/week-strip/week-strip.js";
import { levelMark } from "../../components/level/level.js";
import { weightCard } from "../../components/weight-card/weight-card.js";
import { dayLabel, formatKg } from "./format.js";

export function html({ today, goals, rutinas, sesiones, body, weightGoal }) {
  const goal = goals.fuerzaDiasSemana;
  const done = weekDays(sesiones, today);
  const todays = routinesForDay(rutinas, weekdayOf(today));
  const trainedToday = sesiones.filter((s) => s.fecha === today);
  const streak = weekStreak(sesiones, today, goal);
  const last = [...sesiones].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];

  return `
    <section class="card fuerza-goal content-reveal-position-sm" aria-labelledby="fuerza-goal-title">
      <div class="card__header">
        <h2 class="label" id="fuerza-goal-title">Objetivo de la semana</h2>
        <button class="btn btn--text" type="button" data-action="edit-goal">Editar</button>
      </div>
      <p class="fuerza-goal__value">
        <span class="num num--xl">${done}</span>
        <span class="fuerza-goal__of">de ${goal} ${goal === 1 ? "día" : "días"}</span>
      </p>
      ${dotProgress({ done: Math.min(done, goal), total: goal })}
    </section>

    <section class="card card--flush content-reveal-position-sm" aria-labelledby="fuerza-week-title">
      <h2 class="eyebrow" id="fuerza-week-title">Esta semana</h2>
      ${weekStrip(
        weekKeys(today).map((key) => {
          const trained = sesiones.some((s) => s.fecha === key);
          const planned = routinesForDay(rutinas, weekdayOf(key)).length > 0;
          return {
            key,
            weekday: weekdayOf(key),
            dayNumber: fromDateKey(key).getDate(),
            highlighted: key === today,
            isToday: key === today,
            isFuture: key > today,
            level: trained ? "full" : planned ? "partial" : "none",
            label: `${WEEKDAY_NAMES[weekdayOf(key)]} ${fromDateKey(key).getDate()}: ${
              trained ? "entrenaste" : planned ? "rutina en el plan" : "descanso"
            }`,
          };
        }),
      )}
    </section>

    ${todays.length ? todays.map((r) => routineCard(r, trainedToday)).join("") : restCard(trainedToday)}

    <div class="content-reveal-position-sm">
      ${weightCard({ body, goal: weightGoal, id: "fuerza-weight" })}
    </div>

    <section class="card content-reveal-position-sm" aria-labelledby="fuerza-streak-title">
      <h2 class="eyebrow" id="fuerza-streak-title">Racha</h2>
      <div class="streak__row">
        <p class="num num--md">${streak}</p>
        <p class="label streak__caption">
          ${streak === 1 ? "semana" : "semanas"} seguidas<br />con ${goal} ${goal === 1 ? "día" : "días"} de pesas
        </p>
      </div>
    </section>

    ${last ? lastSession(last, today) : ""}
  `;
}

// Card de la rutina del día (como la card "Today" de openGym)
function routineCard(rutina, trainedToday) {
  const done = trainedToday.some((s) => s.rutina === rutina.nombre);
  const preview = rutina.ejercicios
    .map((e) => `<li><span>${escapeHTML(e.nombre)}</span><span>${e.series} × ${e.reps}</span></li>`)
    .join("");

  return `
    <section class="card fuerza-today content-reveal-position-sm" aria-label="Rutina de hoy: ${escapeHTML(rutina.nombre)}">
      <div class="fuerza-today__top">
        <p class="label">Rutina de hoy</p>
        ${done ? `<p class="label fuerza-done">${levelMark("good")}Hecha</p>` : ""}
      </div>
      <h2 class="fuerza-today__name">${escapeHTML(rutina.nombre)}</h2>
      <p class="label">${rutina.ejercicios.length} ejercicios · ~${estimateMinutes(rutina)} min</p>
      <ul class="fuerza-today__list">${preview}</ul>
      <button class="btn ${done ? "btn--ghost" : "btn--accent"} btn--block" type="button"
        data-action="start" data-routine-id="${escapeHTML(rutina.id)}">
        ${icon("dumbbell")}${done ? "Repetir" : "Empezar"}
      </button>
    </section>
  `;
}

// Día sin rutina en el plan: descanso, o elegir algo igual
function restCard(trainedToday) {
  return `
    <section class="card fuerza-today content-reveal-position-sm" aria-labelledby="fuerza-rest-title">
      <p class="label">Rutina de hoy</p>
      <h2 class="fuerza-today__name" id="fuerza-rest-title">Descanso</h2>
      <p class="label">${
        trainedToday.length ? "Ya entrenaste hoy." : "Hoy no hay rutina en tu plan. Si tenés ganas, elegí una."
      }</p>
      <div class="fuerza-today__actions">
        <button class="btn btn--primary" type="button" data-action="pick-routine">Elegir rutina</button>
        <button class="btn btn--ghost" type="button" data-action="start-free">Entrenamiento libre</button>
      </div>
    </section>
  `;
}

function lastSession(sesion, today) {
  const stats = sessionStats(sesion);
  return `
    <section class="card content-reveal-position-sm" aria-labelledby="fuerza-last-title">
      <h2 class="eyebrow" id="fuerza-last-title">Último entrenamiento</h2>
      <div class="list-row">
        <span class="list-row__icon">${icon("dumbbell")}</span>
        <span class="list-row__body">
          <span class="list-row__title">${escapeHTML(sesion.rutina)}</span>
          <span class="list-row__detail">
            ${escapeHTML(dayLabel(sesion.fecha, today))} · ${sesion.duracionMin} min · ${stats.done} series · ${formatKg(stats.volume)} kg
          </span>
        </span>
      </div>
    </section>
  `;
}
