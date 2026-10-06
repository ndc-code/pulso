/* ============================================
   Components — Tabs
   ============================================ */

// Tabs de una página (Fuerza: Hoy · Plan · Progreso · Ejercicios; Ajustes: Perfil · Salud).
// Se ven como el segmented (pill con borde, la elegida inversa), pero son
// pestañas de verdad para lectores de pantalla: role="tablist" / "tab".
//
//   tabs({ id: "fuerza", value: "hoy", label: "Secciones de Fuerza",
//          options: [{ value: "hoy", label: "Hoy" }, ...] })
//   → el panel de cada tab lleva id="fuerza-panel" y aria-labelledby="fuerza-tab-hoy"
//
// La vista escucha los clicks en [data-tab] y vuelve a pintar el panel.
// bindTabKeys(container) suma las flechas ← → para moverse entre tabs.

import { escapeHTML } from "../../utils/html.js";

export function tabs({ id, value, label, options }) {
  const items = options
    .map((option) => {
      const selected = option.value === value;
      return `
        <button class="tabs__tab" type="button" role="tab" data-tab="${escapeHTML(option.value)}"
          id="${escapeHTML(id)}-tab-${escapeHTML(option.value)}" aria-controls="${escapeHTML(id)}-panel"
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
