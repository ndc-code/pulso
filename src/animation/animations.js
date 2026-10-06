/* ============================================
   Animation — Animations
   ============================================ */

// Punto único que usa el router para animar una vista recién montada.
//
//   const revert = animateView(container);   // al montar
//   revert();                                 // al desmontar
//
// Si GSAP no cargó (sin conexión, CDN caído), la persona pidió menos
// movimiento o la pestaña está oculta, no se anima nada y el contenido
// se ve igual, solo que sin entrada.

import { contentReveal } from "./content-reveal.js";
import { splitText } from "./split-type.js";
import { stackCards } from "./stack-cards.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (typeof gsap !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // Ignora los resize del address bar en mobile para que ScrollTrigger
  // no re-mida todo mientras se scrollea
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export function animateView(container) {
  if (typeof gsap === "undefined" || reducedMotion.matches) return () => {};

  // Con la pestaña oculta nadie ve la entrada, y el navegador frena los frames:
  // el contenido quedaría invisible hasta volver. Se muestra directo.
  if (document.visibilityState === "hidden") return () => {};

  // gsap.context junta todo lo que se crea adentro (tweens, ScrollTriggers,
  // SplitText) para poder revertirlo de una sola vez
  const ctx = gsap.context(() => {
    contentReveal(container);
    splitText(container);
    stackCards(container);
  }, container);

  return () => ctx.revert();
}
