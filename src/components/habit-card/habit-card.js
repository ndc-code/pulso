/* ============================================
   Components — Habit Card
   ============================================ */

// Fila de un hábito en Hoy: ícono, nombre, meta (con barra de progreso
// naranja si es contador) y acción.
//
//   habitCard(habit, state)          → HTML de un <li>
//   updateHabitCard(li, habit, state) → actualiza sin volver a pintar
//
//   state = { value, target, done, profile, parts, canInc, canDec }
//     parts   solo en hábitos con más de una meta (Comida: vasos y comidas,
//             de utils/habits.js → habitParts). Cada parte va en su renglón
//             con sus propios botones.
//     canInc / canDec   opcionales: habilitan el + y el − (por defecto el +
//             siempre y el − si el valor es mayor a 0). Fuerza los usa: un
//             día se marca una sola vez.
//
// Según el hábito, la acción es:
//   "toggle"   check sí/no (manual o respiración)
//   "stepper"  botones − / + (contador manual, agua, Fuerza, horas de Descanso)
//   "log"      + que abre la hoja donde se registra (pasos)
//
// Las acciones llevan data-action (y data-part en las partes); la vista
// escucha los clicks (delegación).

import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";

// Hábitos que se registran en una hoja: `open` es la hoja que abre Hoy
const LOG_TARGETS = {
  steps: { open: "steps", label: "Registrar pasos" },
  meal_veggies: { open: "meal", label: "Registrar comida" },
};

// Texto de los botones − / + según qué mueven
const STEP_LABELS = {
  strength_week: { dec: "Desmarcar hoy como día de pesas", inc: "Marcar hoy como día de pesas" },
  sleep: { dec: "Restar media hora de sueño", inc: "Sumar media hora de sueño" },
};

export function actionKind(habit) {
  if (LOG_TARGETS[habit.source]) return "log";
  if (habit.type === "count") return "stepper";
  return "toggle";
}

const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }); // 8000 → "8.000" · 7.5 → "7,5"

// Texto de la meta, debajo del nombre (los hábitos con partes lo tienen por parte)
export function habitMeta(habit, { value, target, done }) {
  if (habit.source === "strength_week") return `${value} / ${target} días esta semana`;
  if (habit.type === "count") {
    return `${number.format(value)} / ${number.format(target)}${habit.unit ? ` ${habit.unit}` : ""}`;
  }
  if (habit.source === "breathing") {
    return done ? "Hecho" : "Una pausa o una respiración guiada";
  }
  return done ? "Hecho" : "Pendiente";
}

// Ícono de cada renglón de Comida (el hábito no lleva ícono propio)
const PART_ICONS = { "vasos de agua": "glass-water", comidas: "apple" };

const partMeta = (part) => `${number.format(part.value)} / ${number.format(part.target)} ${part.unit}`;

export function habitCard(habit, state) {
  if (state.parts) return partsCard(habit, state);

  // Contadores: barra de progreso debajo de la meta (solo visual: el número ya está en el texto)
  const bar = habit.type === "count" ? barHTML(percentOf(state), "data-habit-bar") : "";

  return `
    <li class="habit-card" data-habit-id="${escapeHTML(habit.id)}" data-done="${state.done}">
      <span class="habit-card__icon">${icon(habit.icon)}</span>
      <div class="habit-card__body">
        <p class="habit-card__name">${escapeHTML(habit.name)}</p>
        <p class="habit-card__meta" data-habit-meta>${escapeHTML(habitMeta(habit, state))}</p>
        ${bar}
      </div>
      <div class="habit-card__action" data-habit-action>${actionHTML(habit, state)}</div>
    </li>
  `;
}

// Comida: el nombre en un renglón y cada parte (vasos, comidas) en el suyo,
// con su ícono en la columna de íconos de los otros hábitos
function partsCard(habit, state) {
  return `
    <li class="habit-card habit-card--parts" data-habit-id="${escapeHTML(habit.id)}" data-done="${state.done}">
      <div class="habit-card__body">
        <p class="habit-card__name habit-card__name--indent">${escapeHTML(habit.name)}</p>
        <ul class="habit-parts">
          ${state.parts.map((part, i) => `
            <li class="habit-part" data-part="${i}">
              <span class="habit-card__icon">${icon(PART_ICONS[part.unit] ?? habit.icon)}</span>
              <div class="habit-part__text">
                <p class="habit-card__meta" data-part-meta>${escapeHTML(partMeta(part))}</p>
                ${barHTML(percentOf(part), "data-part-bar")}
              </div>
              ${partAction(part, i)}
            </li>
          `).join("")}
        </ul>
      </div>
    </li>
  `;
}

// Vasos: − / + · Comidas: + abre "Registrar comida" (la comida necesita sus chips)
function partAction(part, i) {
  if (part.unit === "comidas") {
    return `
      <button class="btn btn--icon" type="button" data-open="meal" aria-label="Registrar una comida">${icon("plus")}</button>
    `;
  }
  return `
    <div class="habit-stepper">
      <button class="btn btn--icon" type="button" data-action="dec" data-part="${i}"
        aria-label="Restar un vaso de agua" ${part.value <= 0 ? "disabled" : ""}>${icon("minus")}</button>
      <button class="btn btn--icon" type="button" data-action="inc" data-part="${i}"
        aria-label="Sumar un vaso de agua">${icon("plus")}</button>
    </div>
  `;
}

export function updateHabitCard(li, habit, state) {
  li.dataset.done = state.done;

  if (state.parts) {
    state.parts.forEach((part, i) => {
      const row = li.querySelector(`[data-part="${i}"]`);
      row.querySelector("[data-part-meta]").textContent = partMeta(part);
      row.querySelector("[data-part-bar]").style.width = `${percentOf(part)}%`;
      const dec = row.querySelector('[data-action="dec"]');
      if (dec) dec.disabled = part.value <= 0;
    });
    return;
  }

  li.querySelector("[data-habit-meta]").textContent = habitMeta(habit, state);
  const bar = li.querySelector("[data-habit-bar]");
  if (bar) bar.style.width = `${percentOf(state)}%`;

  const kind = actionKind(habit);
  if (kind === "toggle") {
    li.querySelector('[data-action="toggle"]').setAttribute("aria-pressed", state.done);
  } else if (kind === "stepper") {
    li.querySelector('[data-action="dec"]').disabled = !canDec(state);
    li.querySelector('[data-action="inc"]').disabled = !canInc(state);
  } else {
    li.querySelector("[data-habit-action]").innerHTML = actionHTML(habit, state);
  }
}

function barHTML(percent, attr) {
  return `<span class="habit-card__bar" aria-hidden="true"><span ${attr} style="width: ${percent}%"></span></span>`;
}

function percentOf({ value, target }) {
  return target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
}

const canInc = (state) => state.canInc ?? true;
const canDec = (state) => state.canDec ?? state.value > 0;

function actionHTML(habit, state) {
  const name = escapeHTML(habit.name);

  switch (actionKind(habit)) {
    case "toggle":
      return `
        <button class="habit-check" type="button" data-action="toggle"
          aria-pressed="${state.done}" aria-label="${name}">${icon("check")}</button>
      `;

    case "stepper": {
      const labels = STEP_LABELS[habit.source] ?? { dec: `Restar 1 a ${name}`, inc: `Sumar 1 a ${name}` };
      return `
        <div class="habit-stepper">
          <button class="btn btn--icon" type="button" data-action="dec"
            aria-label="${labels.dec}" ${canDec(state) ? "" : "disabled"}>${icon("minus")}</button>
          <button class="btn btn--icon" type="button" data-action="inc"
            aria-label="${labels.inc}" ${canInc(state) ? "" : "disabled"}>${icon("plus")}</button>
        </div>
      `;
    }

    default: {
      // Ya cumplido: solo el check. Los pasos no: se pueden seguir actualizando en el día.
      if (state.done && habit.source !== "steps") {
        return `<span class="habit-check habit-check--static" aria-hidden="true">${icon("check")}</span>`;
      }
      const target = LOG_TARGETS[habit.source];
      return `
        <button class="btn btn--icon" type="button" data-open="${target.open}" aria-label="${escapeHTML(target.label)}">
          ${icon("plus")}
        </button>
      `;
    }
  }
}
