/* ============================================
   Animation — Stack Cards
   ============================================ */

// Pila de bloques al scrollear (.block-stack):
// cada bloque queda pegado arriba (position: sticky, en CSS) y, mientras
// el siguiente lo tapa, se achica un poco: se lee como una pila de tarjetas.
// Sin cambiar la opacidad: los bloques son opacos y así no se transparentan.
// Va atado al scroll (scrub), así que avanza y retrocede con el dedo.

export function stackCards(root) {
  root.querySelectorAll(".block-stack").forEach((stack) => {
    const blocks = Array.from(stack.children);

    blocks.forEach((block, i) => {
      const next = blocks[i + 1];
      if (!next) return;

      gsap.to(block, {
        scale: 0.9,
        ease: "none",
        scrollTrigger: {
          trigger: next,
          start: "top bottom",  // cuando el siguiente asoma abajo
          end: "top top+=120",  // hasta que llega arriba
          scrub: true,
        },
      });
    });
  });
}
