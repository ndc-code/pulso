/* ============================================
   Animation — Content Reveal
   ============================================ */

// Reveals con GSAP + ScrollTrigger, aplicados dentro de un contenedor.
// El router lo llama cada vez que monta una vista, dentro de un gsap.context,
// así al salir de la vista se revierten y se limpian todos los triggers.
//
// Clases disponibles (referencia completa en animation-classes.md):
//   .content-reveal-position-sm   aparece subiendo 24px
//   .content-reveal-opacity-sm    aparece con fade
//   .content-reveal-stagger       en el CONTENEDOR: anima sus hijos uno tras otro
//   .content-reveal-skip          en un hijo de stagger: lo excluye

const EASE = "power2.out";

const SCROLL_REVEALS = [
  { selector: ".content-reveal-position-sm", from: { opacity: 0, y: 24 }, delay: 0.1 },
  { selector: ".content-reveal-opacity-sm", from: { opacity: 0 }, delay: 0.1 },
];

export function contentReveal(root) {
  SCROLL_REVEALS.forEach(({ selector, from, delay }) => {
    // un ScrollTrigger por elemento: cada uno dispara según su propia posición
    root.querySelectorAll(selector).forEach((el) => {
      // fromTo (no .from()) para no tomar como destino un estado inicial
      // que alguna sección haya dejado escrito en CSS
      gsap.fromTo(el, from, {
        opacity: 1,
        y: 0,
        delay,
        duration: 0.6,
        ease: EASE,
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    });
  });

  root.querySelectorAll(".content-reveal-stagger").forEach((group) => {
    const items = Array.from(group.children).filter(
      (item) => !item.classList.contains("content-reveal-skip"),
    );
    if (!items.length) return;

    gsap.from(items, {
      opacity: 0,
      y: 16,
      duration: 0.5,
      ease: EASE,
      stagger: 0.08,
      scrollTrigger: { trigger: group, start: "top 90%", once: true },
    });
  });
}
