/* ============================================
   Views — Breathing
   ============================================ */

// Respiración guiada (spec 4.4): una hoja con un círculo que crece al inhalar,
// queda quieto al sostener y se achica al exhalar, con la cuenta regresiva.
// Al terminar (o al cerrarla después de al menos 1 minuto) se marca el hábito
// "Pausa / respiración" de hoy: una pausa corta también cuenta.
//
//   openBreathing({ pattern: "box", minutes: 3 })

import { markBreathing } from "../../store/rest.js";
import { BREATHING_PATTERNS, breathingStep } from "../../utils/sleep.js";
import { todayKey } from "../../utils/dates.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { toast } from "../../components/toast/toast.js";

const TICK_MS = 200;
const MIN_SECONDS = 60; // desde 1 minuto ya cuenta como pausa

export function openBreathing({ pattern: patternValue = "box", minutes = 3 } = {}) {
  const pattern = BREATHING_PATTERNS.find((p) => p.value === patternValue) ?? BREATHING_PATTERNS[0];
  const total = minutes * 60;
  const startedAt = performance.now();
  let timer = null;
  let lastPhase = -1;
  let counted = false; // el hábito se marca una sola vez

  const body = `
    <div class="breath">
      <p class="label">${pattern.name} · ${minutes} min</p>

      <div class="breath__stage" aria-hidden="true">
        <span class="breath__circle" data-circle></span>
        <span class="num num--sm breath__count" data-count></span>
      </div>

      <p class="breath__phase" data-phase aria-live="polite"></p>
      <p class="label breath__left" data-left></p>

      <div class="sheet__actions">
        <button class="btn btn--ghost" type="button" data-stop>Terminar</button>
      </div>
    </div>
  `;

  const sheet = openSheet({
    title: "Respirar",
    body,
    onClose: () => {
      clearInterval(timer);
      // Cerrada antes de tiempo: si ya pasó un minuto, la pausa cuenta igual
      const elapsed = (performance.now() - startedAt) / 1000;
      if (elapsed >= MIN_SECONDS) countPause();
    },
  });

  const el = sheet.element;
  const circle = el.querySelector("[data-circle]");
  const countEl = el.querySelector("[data-count]");
  const phaseEl = el.querySelector("[data-phase]");
  const leftEl = el.querySelector("[data-left]");

  el.querySelector("[data-stop]").addEventListener("click", () => sheet.close());

  async function countPause() {
    if (counted) return;
    counted = true;
    const marked = await markBreathing(todayKey());
    toast(marked ? "Pausa hecha. Se marcó tu hábito." : "Pausa hecha.");
  }

  function finish() {
    clearInterval(timer);
    circle.style.transitionDuration = "0.6s";
    circle.dataset.kind = "out";
    countEl.textContent = "";
    phaseEl.textContent = "Listo.";
    leftEl.textContent = "Volvé a tu ritmo de siempre.";
    el.querySelector("[data-stop]").textContent = "Cerrar";
    countPause();
  }

  function tick() {
    const elapsed = (performance.now() - startedAt) / 1000;
    if (elapsed >= total) {
      finish();
      return;
    }

    const step = breathingStep(pattern, elapsed);
    const index = step.cycle * pattern.phases.length + step.phaseIndex;

    // Cambio de fase: el círculo anima durante toda la fase (CSS transition)
    if (index !== lastPhase) {
      lastPhase = index;
      circle.style.transitionDuration = `${step.phase.seconds}s`;
      if (step.phase.kind !== "hold") circle.dataset.kind = step.phase.kind;
      phaseEl.textContent = step.phase.label;
    }

    countEl.textContent = step.secondsLeft;
    leftEl.textContent = `Quedan ${clock(Math.ceil(total - elapsed))}`;
  }

  // Fuerza a que el navegador pinte el círculo chico antes de la primera fase:
  // si no, la primera "Inhalá" aparecería ya grande, sin animar
  circle.getBoundingClientRect();
  tick();
  timer = setInterval(tick, TICK_MS);
}

// 154 → "2:34"
function clock(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
