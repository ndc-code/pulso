/* ============================================
   App — Router
   ============================================ */

// Router por hash. Cada ruta y el nombre que se ve en la app:
//   #/hoy → Pulso · #/moverse → Ritmo · #/fitness → Fuerza
//   #/comer → Comida · #/descanso → Descanso · #/perfil y #/perfil/habitos
//
// Cada cambio de hash:
//   1. limpia la vista anterior (su cleanup y sus animaciones)
//   2. renderiza la nueva en un contenedor nuevo
//   3. actualiza header, título de la pestaña y la sección activa en la nav
//
// Se usa hash (y no rutas "lindas" /hoy) porque funciona en cualquier
// servidor estático sin configurar nada, y offline como PWA.
//
// Para volver a pintar la vista actual desde cualquier lado (por ejemplo,
// después de importar datos): window.dispatchEvent(new Event("pulso:refresh"))

import * as hoy from "./views/hoy/hoy.js";
import * as moverse from "./views/moverse/moverse.js";
import * as comer from "./views/comer/comer.js";
import * as fitness from "./views/fitness/fitness.js";
import * as descanso from "./views/descanso/descanso.js";
import * as perfil from "./views/perfil/perfil.js";
import * as habitos from "./views/habitos/habitos.js";
import { setHeader, focusHeaderTitle } from "./layout/header/header.js";
import { animateView } from "./animation/animations.js";

const ROUTES = {
  hoy,
  moverse,
  fitness,
  comer,
  descanso,
  perfil,
  "perfil/habitos": habitos,
};
const DEFAULT_ROUTE = "hoy";

let outlet = null;
let cleanupView = null;
let revertAnimations = null;
let navigationId = 0;   // para descartar renders viejos si se navega muy rápido
let isFirstRender = true;

export function startRouter(container) {
  outlet = container;
  window.addEventListener("hashchange", () => render({ moveFocus: true }));
  window.addEventListener("pulso:refresh", () => render({ moveFocus: false }));
  render({ moveFocus: false });
}

// "#/perfil/habitos" → "perfil/habitos"
function currentPath() {
  return location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
}

async function render({ moveFocus }) {
  const path = currentPath();
  const view = ROUTES[path];

  // Hash vacío o desconocido → Hoy. replace() no deja la ruta inválida
  // en el historial; el cambio de hash vuelve a disparar render().
  if (!view) {
    location.replace(`#/${DEFAULT_ROUTE}`);
    return;
  }

  const id = ++navigationId;

  // 1. Limpiar la vista anterior
  revertAnimations?.();
  cleanupView?.();
  revertAnimations = null;
  cleanupView = null;

  // 2. Renderizar la nueva en un contenedor propio
  const viewRoot = document.createElement("div");
  viewRoot.className = "view container";
  const cleanup = await view.render(viewRoot);

  // Si mientras esperábamos se navegó a otra sección, este render ya no sirve
  if (id !== navigationId) {
    if (typeof cleanup === "function") cleanup();
    return;
  }

  outlet.replaceChildren(viewRoot);
  cleanupView = typeof cleanup === "function" ? cleanup : null;
  revertAnimations = animateView(viewRoot);

  // 3. Actualizar el resto de la app
  const section = path.split("/")[0];
  document.title = view.title === "Pulso" ? "Pulso" : `${view.title} · Pulso`;
  setHeader(view);
  markActive(section);

  if (moveFocus && !isFirstRender) {
    window.scrollTo(0, 0);
    focusHeaderTitle();
  }
  isFirstRender = false;
}

// Marca con aria-current los links a la sección actual
// (los de la barra y el avatar del header, para #/perfil y sus subrutas)
function markActive(section) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    if (link.dataset.route === section) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}
