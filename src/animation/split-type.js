/* ============================================
   Animation — Split Type
   ============================================ */

// Split de texto con GSAP SplitText, aplicado dentro de un contenedor.
//
//   <h2 class="split-text" data-split="words">Texto</h2>
//   data-split: "lines" (default) | "words" | "chars"
//
// Como corre dentro del gsap.context del router, al salir de la vista
// SplitText se revierte solo y el texto vuelve a su markup original.

export function splitText(root) {
  root.querySelectorAll(".split-text").forEach((el) => {
    const splitType = el.dataset.split || "lines";

    // tag "span" + aria automático: el texto sigue siendo legible
    // para lectores de pantalla aunque esté partido en spans
    const split = new SplitText(el, {
      type: splitType,
      tag: "span",
      linesClass: "split-line",
      wordsClass: "word",
      charsClass: "char",
    });

    const targets =
      splitType === "lines" ? split.lines : splitType === "words" ? split.words : split.chars;

    gsap.from(targets, {
      yPercent: 100,
      opacity: 0,
      duration: 0.5,
      ease: "power4.out",
      stagger: 0.05,
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });
}
