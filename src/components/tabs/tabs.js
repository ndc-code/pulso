/* ============================================
   Components — Tabs
   ============================================ */

// Tabs de una página (Fuerza: Hoy · Plan · Progreso · Ejercicios; Perfil: Cuenta · App).
// Se ven como el segmented (pill con borde, la elegida inversa), pero son
// pestañas de verdad para lectores de pantalla: role="tablist" / "tab".
//
//   tabs({ id: "fuerza", value: "hoy", label: "Secciones de Fuerza",
//          options: [{ value: "hoy", label: "Hoy" }, ...] })
//   → un solo panel, que la vista vuelve a pintar: id="fuerza-panel"
//     y aria-labelledby="fuerza-tab-hoy"
//
//   tabs({ ..., panelPerTab: true })
//   → un panel por tab, todos en la página y los demás con `hidden`
//     (Perfil: así no se pierde lo escrito al cambiar de tab):
//     id="perfil-panel-cuenta" y aria-labelledby="perfil-tab-cuenta"
//
// La vista escucha los clicks en [data-tab] y muestra el panel que corresponde.
// bindTabKeys(container) suma las flechas ← → para moverse entre tabs.

import { escapeHTML } from "../../utils/html.js";

export function tabs({ id, value, label, options, panelPerTab = false }) {
  const items = options
    .map((option) => {
      const selected = option.value === value;
      const panel = panelPerTab ? `${id}-panel-${option.value}` : `${id}-panel`;
      return `
        <button class="tabs__tab" type="button" role="tab" data-tab="${escapeHTML(option.value)}"
          id="${escapeHTML(id)}-tab-${escapeHTML(option.value)}" aria-controls="${escapeHTML(panel)}"
          aria-selected="${selected}" tabindex="${selected ? 0 : -1}">${escapeHTML(option.label)}</button>
      `;
    })
    .join("");

  return `<div class="tabs" role="tablist" aria-label="${escapeHTML(label)}">${items}</div>`;
}

// Flechas izquierda / derecha: pasan al tab de al lado y lo eligen (click)
export function bindTabKeys(container) {
  container.addEventListener("keydown", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    const all = [...tab.parentElement.querySelectorAll('[role="tab"]')];
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = all[(all.indexOf(tab) + step + all.length) % all.length];
    event.preventDefault();
    next.click();
  });
}
