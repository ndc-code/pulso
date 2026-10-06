/* ============================================
   Components — Dot Progress
   ============================================ */

// Un punto por unidad de una meta: los cumplidos primero, en naranja;
// los que faltan, en gris. Va siempre con el número o la palabra al lado
// (para lectores de pantalla queda oculto: lo dice ese texto).
// Lo usan el resumen de Pulso (un punto por hábito) y el objetivo de Fuerza
// (un punto por día de pesas).
//
//   dotProgress({ done: 2, total: 3 })

export function dotProgress({ done, total }) {
  const dots = Array.from(
    { length: total },
    (_, i) => `<li class="dot-progress__dot${i < done ? " is-done" : ""}"></li>`,
  ).join("");
  return `<ol class="dot-progress" aria-hidden="true">${dots}</ol>`;
}
