/* ============================================
   App — Main
   ============================================ */

// Punto de entrada de la app. Arranca en este orden:
//   1. datos iniciales (hábitos sugeridos, la primera vez)
//   2. tema (antes de pintar las vistas)
//   3. header (saludo, fecha, avatar)
//   4. router (pinta la sección del hash actual)

import { get, subscribe } from "./store/store.js";
import { ensureSeed } from "./store/seed.js";
import { getSession } from "./store/auth.js";
import { applyTheme } from "./utils/theme.js";
import { todayKey } from "./utils/dates.js";
import { initHeader } from "./layout/header/header.js";
import { startRouter } from "./router.js";
import "./layout/grid/grid.js";

async function start() {
  await ensureSeed();

  const profile = await get("profile");
  applyTheme(profile.theme);
  subscribe("profile", (value) => applyTheme(value.theme));

  await initHeader();
  startRouter(document.querySelector("#view"));
  watchDayChange();

  // Sesión con Google (no se espera: la app ya está pintada con lo local)
  getSession();
}

// Si la app queda abierta y pasa la medianoche, "hoy" cambió:
// se vuelve a pintar la vista al volver a la pestaña (o en el próximo minuto)
function watchDayChange() {
  let day = todayKey();

  const check = () => {
    if (todayKey() === day) return;
    day = todayKey();
    window.dispatchEvent(new Event("pulso:refresh"));
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  setInterval(check, 60_000);
}

start();
