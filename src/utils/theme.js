/* ============================================
   Utils — Theme
   ============================================ */

// Aplica la preferencia de tema del perfil al documento.
//
//   "system" → se quita data-theme y manda el sistema operativo
//              (color-scheme: light dark en semantic-colors.css)
//   "light" / "dark" → se fuerza con data-theme en <html>

const root = document.documentElement;
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

export function applyTheme(preference) {
  if (preference === "light" || preference === "dark") {
    root.dataset.theme = preference;
  } else {
    delete root.dataset.theme;
  }
  syncThemeColor();
}

// La barra del navegador / de la app instalada toma el color del canvas.
// Se lee el color ya resuelto (light-dark) en vez de duplicarlo acá.
function syncThemeColor() {
  if (!themeColorMeta) return;
  themeColorMeta.content = getComputedStyle(root).backgroundColor;
}

// Si el tema es "system" y el usuario cambia el modo del sistema operativo,
// el CSS se actualiza solo; acá solo hay que acompañar la barra del navegador.
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", syncThemeColor);
