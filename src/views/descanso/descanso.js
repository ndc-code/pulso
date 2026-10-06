/* ============================================
   Views — Descanso
   ============================================ */

import { placeholder } from "../../components/placeholder/placeholder.js";

export const title = "Descanso";
export const subtitle = "Sueño y estrés";

export function render(root) {
  root.innerHTML = placeholder({
    phase: 2,
    title: "Sueño y estrés",
    text: "Con 7 horas o más, el hábito de dormir se marca solo.",
    items: [
      "Hora de dormir y de despertar, con calidad de 1 a 5",
      "Gráfico semanal de horas con referencia en 7 h",
      "Respiración guiada 4-4-4-4 o 4-7-8",
      "Check-in opcional de ánimo y energía",
    ],
  });
}
