/* ============================================
   Components — Exercise Media
   ============================================ */

// Foto o animación de un ejercicio, en un recuadro cuadrado.
// Si el ejercicio no tiene (los propios), devuelve "" y no ocupa lugar.
//
//   exerciseMedia("Sentadilla")                  → foto chica para listas (48px)
//   exerciseMedia("Sentadilla", { size: "md" })  → animación mediana (modo entrenamiento)
//   exerciseMedia("Sentadilla", { size: "lg" })  → animación grande con el crédito (historial)
//
// En listas y en el entrenamiento la imagen es decorativa (alt vacío):
// el nombre del ejercicio ya está escrito al lado.

import { mediaFor, MEDIA_CREDIT } from "../../content/exercise-media.js";
import { escapeHTML } from "../../utils/html.js";

export function exerciseMedia(nombre, { size = "sm" } = {}) {
  const media = mediaFor(nombre);
  if (!media) return "";

  // la chica es la foto fija (pesa poco); las otras, la animación
  const src = size === "sm" ? media.img : media.gif;
  const alt = size === "lg" ? `Animación: cómo se hace ${nombre}` : "";
  const image = `<img class="exercise-media__img" src="${src}" alt="${escapeHTML(alt)}" width="180" height="180" loading="lazy" decoding="async" />`;

  if (size !== "lg") {
    return `<span class="exercise-media exercise-media--${size}">${image}</span>`;
  }
  return `
    <figure class="exercise-media exercise-media--lg">
      ${image}
      <figcaption class="exercise-media__credit">${escapeHTML(MEDIA_CREDIT)}</figcaption>
    </figure>
  `;
}
