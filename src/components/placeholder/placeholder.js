/* ============================================
   Components — Placeholder
   ============================================ */

// Vista "en construcción": qué va a tener la sección y en qué fase llega.
// Devuelve un string de HTML, como todos los componentes.
//
//   placeholder({
//     phase: 2,
//     title: "Moverse",
//     text: "Ejercicio de la semana...",
//     items: ["Resumen semanal", "Registrar sesión"],
//   })

import { escapeHTML } from "../../utils/html.js";

export function placeholder({ phase, title, text, items = [] }) {
  const list = items
    .map((item) => `<li class="placeholder__item">${escapeHTML(item)}</li>`)
    .join("");

  return `
    <section class="card content-reveal-position-sm">
      <p class="eyebrow placeholder__eyebrow">
        <span class="status-pulse" aria-hidden="true"></span>
        Llega en la fase ${escapeHTML(phase)}
      </p>
      <h2 class="card__title">${escapeHTML(title)}</h2>
      <p class="card__text">${escapeHTML(text)}</p>
    </section>

    <section class="card content-reveal-position-sm">
      <h3 class="eyebrow">Qué va a tener</h3>
      <ul class="placeholder__list content-reveal-stagger">${list}</ul>
    </section>
  `;
}
