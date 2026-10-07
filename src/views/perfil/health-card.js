/* ============================================
   Views — Perfil Salud
   ============================================ */

// Bloque "Pasos desde Salud" de Perfil (solo con sesión): genera la clave
// del Atajo, la muestra una sola vez y explica cómo dejarlo automático.
// Una web no puede leer Salud: lo hace un Atajo de iPhone que manda los
// pasos a Supabase (ver supabase/functions/import-steps).
//
//   const off = mountHealthCard(section);   // off() al salir de la vista

import { currentUser, onAuthChange } from "../../store/auth.js";
import { hasStepsToken, createStepsToken } from "../../store/steps-token.js";
import { SHORTCUT_URL } from "../../config.js";
import { escapeHTML } from "../../utils/html.js";
import { toast } from "../../components/toast/toast.js";

const GUIDE = [
  "Tocá «Copiar clave y abrir el Atajo» y después «Agregar atajo».",
  "Cuando te pida la clave, pegala.",
  "Permití que el Atajo lea tus pasos de Salud.",
  "En la app Atajos, andá a Automatización › + › Hora del día.",
  "Elegí las 23:30 (podés sumar otras, como 12:00 y 18:00) y marcá «Ejecutar de inmediato».",
  "Elegí el atajo «Pulso pasos». Listo: los pasos llegan solos a Ritmo.",
];

export function mountHealthCard(section) {
  let token = null; // la clave recién generada: se muestra solo en esta visita
  let lastUserId = currentUser()?.id ?? null; // para distinguir un cambio de usuario de un refresco de sesión
  let busy = false; // ignora toques repetidos mientras se genera la clave

  const paint = async () => {
    if (!currentUser()) {
      section.hidden = true;
      return;
    }
    const connected = token !== null || (await hasStepsToken()) === true;
    section.hidden = false;
    section.innerHTML = `
      <h2 class="card__title">Pasos desde Salud</h2>
      ${token ? tokenHTML(token) : introHTML(connected)}
      ${token || !connected ? guideHTML() : ""}
      ${connected && !token ? `<button class="btn btn--ghost" type="button" data-new-token>Generar otra clave</button>` : ""}
      ${!connected ? `<button class="btn btn--accent" type="button" data-new-token>Conectar con Salud</button>` : ""}
    `;
  };

  section.addEventListener("click", async (event) => {
    if (event.target.closest("[data-new-token]") && !busy) {
      busy = true;
      try {
        // Si no se pudo saber (null), por las dudas se pide confirmación
        const replacing = token !== null || (await hasStepsToken()) !== false;
        if (replacing && !confirm("La clave anterior deja de funcionar y vas a tener que pegar la nueva en el Atajo. ¿Seguimos?")) return;
        token = await createStepsToken();
        await paint();
      } catch (error) {
        toast(error.message);
      } finally {
        busy = false;
      }
    }

    // Copiar y abrir en el mismo toque: Safari solo deja copiar durante el toque
    if (event.target.closest("[data-copy]")) {
      try {
        await navigator.clipboard.writeText(token);
        toast("Clave copiada");
      } catch {
        toast("No se pudo copiar: mantené apretada la clave para copiarla.");
      }
      if (SHORTCUT_URL) window.open(SHORTCUT_URL, "_blank", "noopener");
    }
  });

  paint();
  return onAuthChange((session) => {
    // Un refresco de sesión (al volver de Atajos) no debe borrar la clave a medio copiar:
    // solo se descarta si cambió el usuario o se cerró la sesión.
    const userId = session?.user?.id ?? null;
    if (userId === null || userId !== lastUserId) token = null;
    lastUserId = userId;
    paint();
  });
}

function introHTML(connected) {
  return connected
    ? `<p class="card__text">Conectado. Los pasos del iPhone llegan solos a Ritmo.</p>`
    : `<p class="card__text">Traé los pasos del iPhone a Ritmo sin cargarlos a mano. Se configura una sola vez.</p>`;
}

function tokenHTML(token) {
  return `
    <div class="perfil__key" role="status">
      <p class="card__text">Tu clave. Se muestra una sola vez:</p>
      <code class="perfil__token">${escapeHTML(token)}</code>
    </div>
    <button class="btn btn--accent" type="button" data-copy>
      ${SHORTCUT_URL ? "Copiar clave y abrir el Atajo" : "Copiar clave"}
    </button>
    ${SHORTCUT_URL ? "" : `<p class="card__text">El Atajo todavía no está publicado.</p>`}
  `;
}

function guideHTML() {
  return `<ol class="perfil__guide">${GUIDE.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}</ol>`;
}
