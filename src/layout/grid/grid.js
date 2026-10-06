/* ============================================
   Layout — Grid
   ============================================ */

// Grilla de ayuda para maquetar. Se prende y apaga con la tecla "g".
// No se activa mientras escribís en un campo de texto.

const COLUMNS = 12; // se crean 12; el CSS oculta las que sobran en mobile

const gridLayout = document.querySelector(".grid-layout");
const gridInner = document.querySelector(".grid-inner");

if (gridLayout && gridInner) {
  for (let i = 0; i < COLUMNS; i++) {
    gridInner.appendChild(document.createElement("div"));
  }

  document.addEventListener("keydown", (event) => {
    const typing = event.target.closest("input, textarea, select, [contenteditable]");
    const withModifier = event.metaKey || event.ctrlKey || event.altKey;

    if (typing || withModifier || event.key.toLowerCase() !== "g") return;
    gridLayout.classList.toggle("hidden");
  });
}
