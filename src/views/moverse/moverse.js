/* ============================================
   Views — Moverse
   ============================================ */

// Ejercicio (spec 4.2). Layout "por día" (referencia de lista de tareas):
//   1. tira de la semana con flechas: se elige un día; las flechas cambian de semana
//   2. card de la semana (como "Steps" de gauge-ui): dial con los minutos,
//      datos al costado y barras por día abajo
//   3. sesiones del día elegido: tags, tipo en grande y un círculo para repetirla hoy;
//      al final, el círculo naranja para registrar una sesión en ese día
//   4. calendario de puntos de las últimas 12 semanas
// El historial "por semana" de la spec se recorre con las flechas.
// (Las rutinas con temporizador llegan en la Fase 6.)

import { get, add, remove, subscribe } from "../../store/store.js";
import { todayKey, addDays, startOfWeek, weekKeys, weekdayOf, fromDateKey, WEEKDAY_LETTERS, WEEKDAY_NAMES } from "../../utils/dates.js";
import { weekSummary, minutesByDay, activityGrid, typeOf, intensityLabel } from "../../utils/workouts.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { ring } from "../../components/gauge/gauge.js";
import { weekStrip } from "../../components/week-strip/week-strip.js";
import { barChart } from "../../components/bar-chart/bar-chart.js";
import { toast } from "../../components/toast/toast.js";
import { openWorkoutForm } from "./workout-form.js";

export const title = "Moverse";
export const subtitle = "Ejercicio y actividad";

const GRID_WEEKS = 12;
const MONTH = new Intl.DateTimeFormat("es-AR", { month: "long" });
const MONTH_SHORT = new Intl.DateTimeFormat("es-AR", { month: "short" });

export async function render(root) {
  const today = todayKey();
  let selected = today;   // día elegido en la tira
  let workouts = [];
  let goal = 150;
  let focusAfterPaint = null;

  async function paint() {
    const [stored, profile, habits] = await Promise.all([get("workout"), get("profile"), get("habit")]);
    workouts = stored ?? [];
    goal = profile.weekly_active_goal;
    // meta diaria: la del hábito Moverme; si no está, la semanal repartida en 7
    const dailyGoal = (habits ?? []).find((h) => h.source === "workout_minutes" && !h.archived)?.target
      ?? Math.round(goal / 7);

    const week = weekKeys(selected);
    const summary = weekSummary(workouts, selected, goal, today);
    const ofDay = workouts.filter((w) => w.date === selected);
    const isCurrentWeek = startOfWeek(selected) === startOfWeek(today);
    const grid = activityGrid(workouts, today, GRID_WEEKS);
    const activeInGrid = grid.flat().filter((d) => d.active).length;

    root.innerHTML = `
      <section class="card move-week content-reveal-position-sm" aria-label="Elegir día">
        <div class="card__header move-week__nav">
          <p class="eyebrow">${monthLabel(week)}</p>
          <div class="move-week__arrows">
            <button class="btn btn--icon move-week__arrow" type="button" data-week="-1" data-focus="week-prev"
              aria-label="Semana anterior">${icon("chevron-left")}</button>
            <button class="btn btn--icon move-week__arrow move-week__arrow--next" type="button" data-week="1" data-focus="week-next"
              aria-label="Semana siguiente" ${isCurrentWeek ? "disabled" : ""}>${icon("chevron-left")}</button>
          </div>
        </div>
        ${weekStrip(
          week.map((key) => {
            const active = workouts.some((w) => w.date === key);
            return {
              key,
              weekday: weekdayOf(key),
              dayNumber: fromDateKey(key).getDate(),
              highlighted: key === selected,
              isToday: key === today,
              isFuture: key > today,
              level: active ? "full" : "none",
              label: `${dayName(key, today)}${active ? ", con actividad" : ""}`,
            };
          }),
          { selectable: true },
        )}
      </section>

      <section class="move-card content-reveal-position-sm" aria-labelledby="move-card-title">
        <div class="move-card__top">
          <h2 class="label" id="move-card-title">Minutos de la semana</h2>
          <p class="label">Meta: ${goal}</p>
        </div>

        <div class="move-card__main">
          <div class="move-dial">
            ${ring({ value: summary.minutes, max: goal, size: 152, width: 12, start: 60, end: 300, ticks: 10, label: `${summary.minutes} de ${goal} minutos` })}
            <p class="move-dial__value" aria-hidden="true">
              <span class="num num--sm">${summary.minutes}</span>
              <span class="move-dial__of">de ${goal} min</span>
            </p>
          </div>
          <dl class="move-readouts">
            <div><dt>Sesiones</dt><dd>${summary.sessions}</dd></div>
            <div><dt>Promedio</dt><dd>${summary.dailyAverage} min</dd></div>
            <div><dt>Faltan</dt><dd>${summary.remaining ? `${summary.remaining} min` : "—"}</dd></div>
            <div><dt>Días activos</dt><dd>${summary.activeDays}</dd></div>
          </dl>
        </div>

        ${barChart({
          days: minutesByDay(workouts, selected).map((day) => ({
            label: WEEKDAY_LETTERS[day.weekday],
            name: `${WEEKDAY_NAMES[day.weekday]} ${day.dayNumber}`,
            value: day.minutes,
            isToday: day.key === today,
            isFuture: day.key > today,
          })),
          goal: dailyGoal,
          unit: "min",
          goalLabel: "Meta diaria",
        })}
      </section>

      <section aria-labelledby="move-day-title">
        <h2 class="visually-hidden" id="move-day-title" tabindex="-1">Sesiones del ${dayName(selected, today)}</h2>
        <ul class="move-list">
          ${ofDay.map((w) => sessionItem(w, today)).join("")}
          <li class="move-item move-item--add">
            <div class="move-item__body">
              <p class="move-item__title">${ofDay.length ? "Sumar otra sesión" : "Sin sesiones"}</p>
              <p class="label">${selected === today ? "hoy" : dayName(selected, today)}</p>
            </div>
            <button class="move-item__action move-item__action--accent" type="button" data-open="workout"
              aria-label="Registrar sesión del ${escapeHTML(dayName(selected, today))}">${icon("plus")}</button>
          </li>
        </ul>
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="move-grid-title">
        <div class="card__header">
          <h2 class="eyebrow" id="move-grid-title">Últimas ${GRID_WEEKS} semanas</h2>
          <p class="label">${activeInGrid} ${activeInGrid === 1 ? "día activo" : "días activos"}</p>
        </div>
        ${dotCalendar(grid)}
      </section>
    `;

    // Los botones se repintan: el foco vuelve al equivalente (o a donde se pidió)
    const target = focusAfterPaint;
    focusAfterPaint = null;
    if (target) root.querySelector(target)?.focus();
  }

  root.addEventListener("click", async (event) => {
    const arrow = event.target.closest("[data-week]");
    if (arrow) {
      const next = addDays(selected, Number(arrow.dataset.week) * 7);
      selected = next > today ? today : next; // la semana actual se abre en hoy
      focusAfterPaint = `[data-focus="${arrow.dataset.focus}"]:not(:disabled)`;
      paint();
      return;
    }

    const day = event.target.closest("[data-day]");
    if (day) {
      selected = day.dataset.day;
      focusAfterPaint = `[data-day="${selected}"]`;
      paint();
      return;
    }

    if (event.target.closest('[data-open="workout"]')) {
      openWorkoutForm({ date: selected });
      return;
    }

    const item = event.target.closest("[data-workout-id]");
    if (!item) return;
    const workout = workouts.find((w) => w.id === item.dataset.workoutId);

    if (event.target.closest("[data-repeat]")) {
      // misma sesión, registrada hoy
      const { type, duration_min, intensity } = workout;
      await add("workout", { date: today, type, duration_min, intensity, routine_id: null, note: "" });
      toast(`${typeOf(type).label} de ${duration_min} min sumada hoy`);
      return;
    }

    if (event.target.closest("[data-delete]")) {
      if (!confirm(`¿Borrar la sesión de ${typeOf(workout.type).label.toLowerCase()} de ${workout.duration_min} min?`)) return;
      focusAfterPaint = "#move-day-title";
      await remove("workout", workout.id); // avisa al store → paint()
      toast("Sesión borrada");
    }
  });

  const offs = ["workout", "profile"].map((key) => subscribe(key, paint));

  await paint();
  return () => offs.forEach((off) => off());
}

/* ---------------------------------------- */
/* Piezas */
/* ---------------------------------------- */

// "octubre", o "sept – oct" si la semana cruza de mes
function monthLabel(week) {
  const first = fromDateKey(week[0]);
  const last = fromDateKey(week[6]);
  if (first.getMonth() === last.getMonth()) return MONTH.format(first);
  return `${MONTH_SHORT.format(first).replace(".", "")} – ${MONTH_SHORT.format(last).replace(".", "")}`;
}

function dayName(key, today) {
  if (key === today) return "hoy";
  return `${WEEKDAY_NAMES[weekdayOf(key)]} ${fromDateKey(key).getDate()}`;
}

function sessionItem(workout, today) {
  const type = typeOf(workout.type);
  const label = `${type.label.toLowerCase()} de ${workout.duration_min} min`;

  return `
    <li class="move-item" data-workout-id="${escapeHTML(workout.id)}">
      <div class="move-item__body">
        <p class="move-item__tags">
          <span class="move-tag">${workout.duration_min} min</span>
          <span class="move-tag">${escapeHTML(intensityLabel(workout.intensity).toLowerCase())}</span>
        </p>
        <p class="move-item__title">${escapeHTML(type.label)}</p>
        ${workout.note ? `<p class="label">${escapeHTML(workout.note)}</p>` : ""}
        <button class="btn btn--text move-item__delete" type="button" data-delete
          aria-label="Borrar ${escapeHTML(label)}">borrar</button>
      </div>
      <button class="move-item__action" type="button" data-repeat
        aria-label="Repetir ${escapeHTML(label)} hoy">repetir</button>
    </li>
  `;
}

// Calendario de puntos: una columna por semana, una fila por día.
// Arriba, el mes cuando cambia de una columna a otra.
function dotCalendar(grid) {
  let lastMonth = null;
  const months = grid
    .map((week) => {
      const month = fromDateKey(week[0].key).getMonth();
      const label = month !== lastMonth ? MONTH_SHORT.format(fromDateKey(week[0].key)).replace(".", "") : "";
      lastMonth = month;
      return `<span>${label}</span>`;
    })
    .join("");

  const dots = grid
    .flat()
    .map((day) => {
      const classes = ["dots__dot", day.active && "is-active", day.isToday && "is-today", day.isFuture && "is-future"]
        .filter(Boolean)
        .join(" ");
      return `<span class="${classes}"></span>`;
    })
    .join("");

  return `
    <div class="dots" aria-hidden="true" style="--weeks: ${grid.length}">
      <div class="dots__months">${months}</div>
      <div class="dots__grid">${dots}</div>
    </div>
  `;
}
