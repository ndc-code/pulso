/* ============================================
   Views — Fitness Goal Form
   ============================================ */

// Hoja "Objetivo de pesas": cuántos días por semana (1 a 7), con − / +.
//
//   openGoalForm(3, (dias) => setGoals({ fuerzaDiasSemana: dias }))

import { icon } from "../../utils/icons.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { toast } from "../../components/toast/toast.js";

const MIN = 1;
const MAX = 7;

export function openGoalForm(current, onSave) {
  let days = current;

  const sheet = openSheet({
    title: "Objetivo de pesas",
    body: `
      <form class="fuerza-form" novalidate>
        <p class="card__text">Cuántos días por semana querés entrenar con pesas. Para empezar, 2 o 3 alcanzan.</p>
        <div class="fuerza-stepper">
          <button class="btn btn--icon" type="button" data-step="-1" aria-label="Un día menos">${icon("minus")}</button>
          <p class="fuerza-stepper__value" aria-live="polite">
            <span class="num num--md" data-days>${days}</span>
            <span class="label" data-unit>${days === 1 ? "día" : "días"} por semana</span>
          </p>
          <button class="btn btn--icon" type="button" data-step="1" aria-label="Un día más">${icon("plus")}</button>
        </div>
        <div class="sheet__actions">
          <button class="btn btn--primary" type="submit">Guardar</button>
        </div>
      </form>
    `,
  });

  const form = sheet.element.querySelector("form");
  const update = () => {
    form.querySelector("[data-days]").textContent = days;
    form.querySelector("[data-unit]").textContent = `${days === 1 ? "día" : "días"} por semana`;
    form.querySelector('[data-step="-1"]').disabled = days <= MIN;
    form.querySelector('[data-step="1"]').disabled = days >= MAX;
  };
  update();

  form.addEventListener("click", (event) => {
    const step = event.target.closest("[data-step]");
    if (!step) return;
    days = Math.min(MAX, Math.max(MIN, days + Number(step.dataset.step)));
    update();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await onSave(days);
    toast("Objetivo guardado");
    sheet.close();
  });
}
