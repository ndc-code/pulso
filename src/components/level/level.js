/* ============================================
   Components — Level
   ============================================ */

// Marca de nivel en naranja (reemplaza al verde / amarillo / rojo):
//   "good" lleno · "mid" a medias · "low" solo el aro · "none" gris
// Es decorativa: el nivel siempre va escrito al lado ("Buen día").
//
//   levelMark("good")            → 12px
//   levelMark("mid", "lg")       → 56px

export function levelMark(level, size = "sm") {
  return `<span class="level level--${size}" data-level="${level}" aria-hidden="true"></span>`;
}
