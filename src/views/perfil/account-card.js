/* ============================================
   Views — Perfil Cuenta
   ============================================ */

// Bloque "Cuenta" de Perfil: entrar con Google o, con sesión, el mail,
// el estado de la sincronización y el botón para salir.
//
//   const off = mountAccountCard(section);   // off() al salir de la vista

import { currentUser, onAuthChange } from "../../store/auth.js";
import { login, logout } from "../../store/account.js";
import { getStatus, onStatusChange } from "../../store/sync.js";
import { syncStatusText } from "../../utils/sync.js";
import { escapeHTML } from "../../utils/html.js";
import { toast } from "../../components/toast/toast.js";

export function mountAccountCard(section) {
  let loggingOut = false; // ignora toques repetidos mientras cierra
  const paint = async () => {
    const user = currentUser();
    if (!user) {
      section.innerHTML = `
        <h2 class="card__title">Cuenta</h2>
        <p class="card__text">Guardá tus datos y usalos en todos tus dispositivos.</p>
        <button class="btn btn--primary" type="button" data-login>Entrar con Google</button>
      `;
      return;
    }

    const status = await getStatus();
    section.innerHTML = `
      <h2 class="card__title">Cuenta</h2>
      <p class="card__text">${escapeHTML(user.email)}</p>
      <p class="card__text" role="status">${escapeHTML(syncStatusText(status))}</p>
      <button class="btn btn--ghost" type="button" data-logout>Cerrar sesión</button>
    `;
  };

  section.addEventListener("click", async (event) => {
    if (event.target.closest("[data-login]")) {
      try {
        await login();
      } catch (error) {
        toast(error.message);
      }
    }
    if (event.target.closest("[data-logout]") && !loggingOut) {
      loggingOut = true;
      try {
        await logout();
      } catch (error) {
        console.warn("[account]", error);
        toast("No se pudo cerrar la sesión. Probá de nuevo.");
      } finally {
        loggingOut = false;
      }
    }
  });

  paint();
  const offAuth = onAuthChange(paint);
  const offStatus = onStatusChange(paint);
  const timer = setInterval(paint, 60_000); // "hace 2 min" se mantiene al día

  return () => {
    offAuth();
    offStatus();
    clearInterval(timer);
  };
}
