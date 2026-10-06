/* ============================================
   Views — Perfil Cuenta
   ============================================ */

// Bloque "Cuenta" de Perfil: entrar con Google o, con sesión, el mail
// y el botón para salir.
//
//   const off = mountAccountCard(section);   // off() al salir de la vista

import { currentUser, onAuthChange, signInWithGoogle } from "../../store/auth.js";
import { escapeHTML } from "../../utils/html.js";
import { toast } from "../../components/toast/toast.js";

export function mountAccountCard(section) {
  const paint = () => {
    const user = currentUser();
    section.innerHTML = user
      ? `
        <h2 class="card__title">Cuenta</h2>
        <p class="card__text">${escapeHTML(user.email)}</p>
      `
      : `
        <h2 class="card__title">Cuenta</h2>
        <p class="card__text">Guardá tus datos y usalos en todos tus dispositivos.</p>
        <button class="btn btn--primary" type="button" data-login>Entrar con Google</button>
      `;
  };

  section.addEventListener("click", async (event) => {
    if (!event.target.closest("[data-login]")) return;
    try {
      await signInWithGoogle();
    } catch (error) {
      toast(error.message);
    }
  });

  paint();
  return onAuthChange(paint);
}
