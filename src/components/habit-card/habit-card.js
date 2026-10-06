/* ============================================
   Components — Habit Card
   ============================================ */

// Fila de un hábito en Hoy: ícono, nombre, meta (con barra de progreso
// naranja si es contador) y acción.
//
//   habitCard(habit, { value, target, done, profile })   → HTML de un <li>
//   updateHabitCard(li, habit, state)                    → actualiza sin volver a pintar
//
// Según el hábito, la acción es:
//   "toggle"   check sí/no (manual o respiración)
//   "stepper"  botones − / + (contador manual o agua)
//   "log"      link a la sección donde se registra (entrenos, comidas, sueño)
//
// Las acciones llevan data-action; la vista escucha los clicks (delegación).

import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";

// Dónde se registra cada hábito automático.
// `open` abre una hoja sin salir de Hoy; `href` lleva a la sección
// (sueño pasa a hoja cuando se haga Descanso).
const LOG_TARGETS = {
  workout_minutes: { open: "workout", label: "Registrar entreno" },
  meal_veggies: { open: "meal", label: "Registrar comida" },
  sleep: { href: "#/descanso", label: "Registrar sueño" },
};

export function actionKind(habit) {
  if (LOG_TARGETS[habit.source]) return "log";
  if (habit.type === "count") return "stepper";
  return "toggle";
}

// Texto de la meta, debajo del nombre
export function habitMeta(habit, { value, target, done, profile }) {
  if (habit.type === "count") {
    return `${value} / ${target}${habit.unit ? ` ${habit.unit}` : ""}`;
  }
  if (habit.source === "sleep") {
    return done ? `Dormiste ${profile.sleep_goal} h o más` : `Se marca solo con ${profile.sleep_goal} h de sueño`;
  }
  if (habit.source === "breathing") {
    return done ? "Hecho" : "Una pausa o una respiración guiada";
  }
  return done ? "Hecho" : "Pendiente";
}

export function habitCard(habit, state) {
  const name = escapeHTML(habit.name);
  const isCount = habit.type === "count";

  // Contadores: barra de progreso debajo de la meta (solo visual: el número ya está en el texto)
  const bar = isCount
    ? `<span class="habit-card__bar" aria-hidden="true"><span data-habit-bar style="width: ${percentOf(state)}%"></span></span>`
    : "";

  return `
    <li class="habit-card" data-habit-id="${escapeHTML(habit.id)}" data-done="${state.done}">
      <span class="habit-card__icon">${icon(habit.icon)}</span>
      <div class="habit-card__body">
        <p class="habit-card__name">${name}</p>
        <p class="habit-card__meta" data-habit-meta>${escapeHTML(habitMeta(habit, state))}</p>
        ${bar}
      </div>
      <div class="habit-card__action" data-habit-action>${actionHTML(habit, state)}</div>
    </li>
  `;
}

export function updateHabitCard(li, habit, state) {
  li.dataset.done = state.done;
  li.querySelector("[data-habit-meta]").textContent = habitMeta(habit, state);

  const bar = li.querySelector("[data-habit-bar]");
  if (bar) bar.style.width = `${percentOf(state)}%`;

  const kind = actionKind(habit);
  if (kind === "toggle") {
    li.querySelector('[data-action="toggle"]').setAttribute("aria-pressed", state.done);
  } else if (kind === "stepper") {
    li.querySelector('[data-action="dec"]').disabled = state.value <= 0;
  } else {
    li.querySelector("[data-habit-action]").innerHTML = actionHTML(habit, state);
  }
}

function percentOf({ value, target }) {
  return target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
}

function actionHTML(habit, state) {
  const name = escapeHTML(habit.name);

  switch (actionKind(habit)) {
    case "toggle":
      return `
        <button class="habit-check" type="button" data-action="toggle"
          aria-pressed="${state.done}" aria-label="${name}">${icon("check")}</button>
      `;

    case "stepper":
      return `
        <div class="habit-stepper">
          <button class="btn btn--icon" type="button" data-action="dec"
            aria-label="Restar 1 a ${name}" ${state.value <= 0 ? "disabled" : ""}>${icon("minus")}</button>
          <button class="btn btn--icon" type="button" data-action="inc"
            aria-label="Sumar 1 a ${name}">${icon("plus")}</button>
        </div>
      `;

    default: {
      // Sí/no automático ya cumplido (sueño): solo el check, no hay nada que registrar
      if (habit.type === "bool" && state.done) {
        return `<span class="habit-check habit-check--static" aria-hidden="true">${icon("check")}</span>`;
      }
      const target = LOG_TARGETS[habit.source];
      if (target.open) {
        return `
          <button class="btn btn--icon" type="button" data-open="${target.open}" aria-label="${escapeHTML(target.label)}">
            ${icon("plus")}
          </button>
        `;
      }
      return `
        <a class="btn btn--icon" href="${target.href}" aria-label="${escapeHTML(target.label)}">
          ${icon("plus")}
        </a>
      `;
    }
  }
}
