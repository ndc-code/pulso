/* ============================================
   Views — Weight Actions
   ============================================ */

// Los botones de la tarjeta de peso (components/weight-card), iguales en
// Pulso (Hoy) y en Fuerza. La vista llama a esto desde su listener de clicks:
//
//   if (handleWeightClick(event, { body, goal })) return;
//
// Devuelve true si el click era de la tarjeta de peso.

import { weightProgress } from "../../utils/health.js";
import { openBodyForm } from "./body-form.js";
import { openWeighIns } from "./weigh-ins.js";

export function handleWeightClick(event, { body, goal }) {
  const button = event.target.closest("[data-weight]");
  if (!button) return false;

  if (button.dataset.weight === "log") {
    openBodyForm({ weight: weightProgress(body, null)?.latest.weight ?? "", goal });
  } else {
    openWeighIns(body);
  }
  return true;
}
