/* ============================================
   Views — Habitos
   ============================================ */

// Gestión de hábitos (#/perfil/habitos): crear, editar, archivar, reordenar.
// Toda la fila abre el editor; al costado quedan subir y bajar.

import { get, subscribe } from "../../store/store.js";
import { moveHabit, setArchived } from "../../store/habits.js";
import { sortByOrder } from "../../utils/habits.js";
import { WEEK_ORDER, WEEKDAY_LETTERS } from "../../utils/dates.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { toast } from "../../components/toast/toast.js";
import { openHabitForm } from "./habit-form.js";

export const title = "Hábitos";
export const subtitle = "Crear, ordenar y archivar";
export const back = "#/perfil";

export async function render(root) {
  let habits = (await get("habit")) ?? [];

  root.innerHTML = `
    <button class="btn btn--accent btn--block content-reveal-position-sm" type="button" data-new>
      ${icon("plus")}Nuevo hábito
    </button>
    <section class="card content-reveal-position-sm" aria-labelledby="habitos-active">
      <h2 class="card__title" id="habitos-active">Activos</h2>
      <ul class="list" data-active></ul>
    </section>
    <section class="card" aria-labelledby="habitos-archived" data-archived-section hidden>
      <h2 class="card__title" id="habitos-archived">Archivados</h2>
      <ul class="list" data-archived></ul>
    </section>
  `;

  function paint() {
    const active = sortByOrder(habits.filter((h) => !h.archived));
    const archived = habits.filter((h) => h.archived);

    root.querySelector("[data-active]").innerHTML = active.length
      ? active.map((habit, i) => activeRow(habit, i, active.length)).join("")
      : `<li class="card__text">No tenés hábitos activos.</li>`;

    root.querySelector("[data-archived-section]").hidden = archived.length === 0;
    root.querySelector("[data-archived]").innerHTML = archived.map(archivedRow).join("");
  }

  // Al cerrar el editor la lista ya se repintó: el foco vuelve al botón
  // equivalente de la fila nueva, o a "Nuevo hábito" si la fila ya no está
  const focusAfterClose = (id) => () => {
    if (document.activeElement !== document.body) return;
    const edit = id && root.querySelector(`[data-habit-id="${CSS.escape(id)}"] [data-action="edit"]`);
    (edit ?? root.querySelector("[data-new]")).focus();
  };

  root.addEventListener("click", async (event) => {
    if (event.target.closest("[data-new]")) {
      openHabitForm(null, focusAfterClose(null));
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const id = button.closest("[data-habit-id]").dataset.habitId;
    const habit = habits.find((h) => h.id === id);

    switch (button.dataset.action) {
      case "edit":
        openHabitForm(habit, focusAfterClose(id));
        break;
      case "up":
      case "down":
        await moveHabit(id, button.dataset.action === "up" ? -1 : 1);
        // el foco sigue al botón del hábito que se movió
        root.querySelector(`[data-habit-id="${CSS.escape(id)}"] [data-action="${button.dataset.action}"]:not(:disabled)`)?.focus();
        break;
      case "restore":
        await setArchived(id, false);
        toast("Hábito restaurado");
        break;
    }
  });

  const off = subscribe("habit", (value) => {
    habits = value ?? [];
    paint();
  });

  paint();
  return off;
}

function activeRow(habit, index, total) {
  const name = escapeHTML(habit.name);
  return `
    <li class="list-row" data-habit-id="${escapeHTML(habit.id)}">
      <!-- toda la fila (ícono + texto) es el botón de editar -->
      <button class="list-row__main" type="button" data-action="edit" aria-label="Editar ${name}">
        <span class="list-row__icon">${icon(habit.icon)}</span>
        <span class="list-row__body">
          <span class="list-row__title">${name}</span>
          <span class="list-row__detail">${escapeHTML(habitDetail(habit))}</span>
        </span>
      </button>
      <span class="list-row__actions">
        <button class="btn btn--icon" type="button" data-action="up" aria-label="Subir ${name}" ${index === 0 ? "disabled" : ""}>${icon("chevron-up")}</button>
        <button class="btn btn--icon" type="button" data-action="down" aria-label="Bajar ${name}" ${index === total - 1 ? "disabled" : ""}>${icon("chevron-down")}</button>
      </span>
    </li>
  `;
}

function archivedRow(habit) {
  const name = escapeHTML(habit.name);
  return `
    <li class="list-row" data-habit-id="${escapeHTML(habit.id)}" style="color: var(--color-text-muted)">
      <span class="list-row__icon">${icon(habit.icon)}</span>
      <span class="list-row__body"><span class="list-row__title">${name}</span></span>
      <span class="list-row__actions">
        <button class="btn btn--accent" type="button" data-action="restore" aria-label="Restaurar ${name}">
          ${icon("archive-restore")}Restaurar
        </button>
      </span>
    </li>
  `;
}

// "8 vasos · todos los días", "Sí / No · L M X J V"
function habitDetail(habit) {
  const goal = habit.type === "count"
    ? (habit.source === "water" ? "meta en Perfil" : `${habit.target} ${habit.unit}`.trim())
    : "Sí / No";
  return `${goal} · ${daysLabel(habit.days)}`;
}

function daysLabel(days) {
  if (days.length === 7) return "todos los días";
  const set = new Set(days);
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "lunes a viernes";
  if (days.length === 2 && set.has(0) && set.has(6)) return "fines de semana";
  return WEEK_ORDER.filter((d) => set.has(d)).map((d) => WEEKDAY_LETTERS[d]).join(" ");
}
