/* ============================================
   Components — Sheet
   ============================================ */

// Abre una hoja modal.
//
//   const sheet = openSheet({
//     title: "Nuevo hábito",
//     body: "<form>...</form>",        // HTML propio (escapar lo que venga del usuario)
//     onClose: () => { ... },          // opcional
//   });
//   sheet.element   → el <dialog>, para buscar elementos y escuchar eventos
//   sheet.close()   → la cierra (también se cierra con Escape, la X o tocando afuera)
//
// Al cerrarse se borra del DOM y el foco vuelve al elemento que la abrió
// (si ese elemento ya no existe, onClose puede decidir a dónde mandarlo).

import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";

// Contador para que cada hoja tenga su propio id de título
// (se pueden abrir dos a la vez: "Editar rutina" → "Elegir ejercicio")
let sheetCount = 0;

export function openSheet({ title, body, onClose }) {
  const opener = document.activeElement;
  const titleId = `sheet-title-${++sheetCount}`;
  const dialog = document.createElement("dialog");
  dialog.className = "sheet";
  dialog.setAttribute("aria-labelledby", titleId);
  dialog.innerHTML = `
    <div class="sheet__inner">
      <header class="sheet__header">
        <h2 class="sheet__title" id="${titleId}">${escapeHTML(title)}</h2>
        <button class="btn btn--icon" type="button" data-sheet-close aria-label="Cerrar">${icon("x")}</button>
      </header>
      <div class="sheet__body">${body}</div>
    </div>
  `;

  // Limpieza: se borra del DOM una sola vez, cierre como se cierre
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    dialog.remove();
    if (opener?.isConnected) opener.focus();
    onClose?.();
  };

  const close = () => {
    dialog.close();
    cleanup();
  };

  dialog.querySelector("[data-sheet-close]").addEventListener("click", close);

  // Tocar el fondo oscuro (fuera del contenido) cierra
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  // Escape lo cierra el navegador: el evento "close" llega después
  dialog.addEventListener("close", cleanup);

  document.body.appendChild(dialog);
  dialog.showModal();

  return { element: dialog, close };
}
