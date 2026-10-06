/* ============================================
   Utils — HTML
   ============================================ */

// Los componentes son funciones que devuelven strings de HTML.
// Todo texto que viene del usuario (nombre, notas...) pasa por escapeHTML
// antes de entrar en un template, para que no se interprete como código.

const ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ENTITIES[char]);
}
