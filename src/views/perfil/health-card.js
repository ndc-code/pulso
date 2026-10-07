/* ============================================
   Views — Perfil Salud
   ============================================ */

// Bloque "Conexiones" de Perfil › Cuenta: la guía paso a paso para traer
// los pasos del iPhone a Ritmo. Una web no puede leer Salud: lo hace un
// Atajo de iPhone que manda los pasos a Supabase (supabase/functions/import-steps).
//
// Cada paso se marca "Hecho" según lo que la app puede saber (ver
// utils/connect-steps.js). Con todo hecho, la guía queda plegada.
//
//   const off = mountHealthCard(section);   // off() al salir de la vista

import { get, subscribe } from "../../store/store.js";
import { currentUser, onAuthChange } from "../../store/auth.js";
import { hasStepsToken, createStepsToken } from "../../store/steps-token.js";
import { SHORTCUT_URL } from "../../config.js";
import { STEPS_INTRO, STEPS_GUIDE } from "../../content/steps-guide.js";
import { lastHealthImport, connectSteps } from "../../utils/connect-steps.js";
import { todayKey, addDays, shortDate } from "../../utils/dates.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { toast } from "../../components/toast/toast.js";

// La clave recién generada vive fuera de mountHealthCard: si Perfil se vuelve
// a pintar (un "pulso:refresh" al bajar datos) se sigue viendo. Se muestra
// solo mientras la página esté abierta, y se descarta si cambia el usuario
// o se cierra la sesión.
let token = null;
let tokenUserId = null; // de quién es la clave

export function mountHealthCard(section) {
  let busy = false; // ignora toques repetidos mientras se genera la clave

  // Montado con otro usuario (o sin sesión): la clave guardada no es de esta persona
  if (token !== null && (currentUser()?.id ?? null) !== tokenUserId) token = null;

  const paint = async () => {
    const signedIn = currentUser() !== null;
    const [hasKey, stepLogs] = await Promise.all([
      !signedIn ? false : token !== null ? true : hasStepsToken(),
      get("steps_log"),
    ]);
    const lastImport = lastHealthImport(stepLogs);
    const { status, connected } = connectSteps({ signedIn, hasKey, lastImport });

    const steps = `<ol class="list perfil__steps">${STEPS_GUIDE.map((step, index) =>
      stepHTML(step, index, status[index], actionHTML(index, status[index], lastImport)),
    ).join("")}</ol>`;
    // "Generar otra clave" solo si seguro hay una (si no, el paso 2 ya tiene su botón)
    const newKey = signedIn && hasKey === true && token === null
      ? `<button class="btn btn--ghost" type="button" data-new-token>Generar otra clave</button>`
      : "";

    section.innerHTML = `
      <h2 class="card__title">Conexiones</h2>
      <div class="card">
        <h3 class="perfil__connect-title">Pasos del iPhone</h3>
        <p class="card__text">${connected ? `Conectado. ${escapeHTML(importText(lastImport))}.` : STEPS_INTRO}</p>
      </div>
      ${connected
        ? `<details class="perfil__connect-more">
             <summary class="btn btn--text">Ver los pasos de nuevo</summary>
             ${steps}
           </details>`
        : steps}
      ${newKey}
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
        tokenUserId = currentUser()?.id ?? null;
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
  // Cuando llegan pasos nuevos (la sincronización baja lo que mandó el Atajo)
  const offSteps = subscribe("steps_log", paint);
  const offAuth = onAuthChange((session) => {
    // Un refresco de sesión (al volver de Atajos) no debe borrar la clave a medio copiar:
    // solo se descarta si cambió el usuario o se cerró la sesión.
    const userId = session?.user?.id ?? null;
    if (userId === null || userId !== tokenUserId) token = null;
    paint();
  });

  return () => {
    offSteps();
    offAuth();
  };
}

// Un paso de la guía. El estado se dice con texto ("Hecho", "Paso actual"),
// no solo con el color del número.
function stepHTML(step, index, status, action) {
  const badge = status === "done" ? icon("check") : String(index + 1);
  const label = status === "done" ? "Hecho" : status === "current" ? "Ahora" : "";
  return `
    <li class="perfil__step perfil__step--${status}" ${status === "current" ? 'aria-current="step"' : ""}>
      <span class="perfil__step-badge" aria-hidden="true">${badge}</span>
      <div class="perfil__step-body">
        <h4 class="perfil__step-title">
          ${escapeHTML(step.title)}
          ${label ? `<span class="perfil__step-label">${label}</span>` : ""}
        </h4>
        <p class="card__text">${escapeHTML(step.text)}</p>
        ${action}
      </div>
    </li>
  `;
}

// Lo que se puede hacer en cada paso (botón, clave o último dato)
function actionHTML(index, status, lastImport) {
  // 2 · Generar la clave
  if (index === 1 && status === "current") {
    return `<button class="btn btn--accent" type="button" data-new-token>Generar clave</button>`;
  }
  // 2 y 3 · La clave recién generada y el botón para copiarla y abrir el Atajo
  if (index === 1 && token !== null) return keyHTML(token);
  if (index === 2 && token !== null) {
    return `
      <button class="btn btn--accent" type="button" data-copy>
        ${SHORTCUT_URL ? "Copiar clave y abrir el Atajo" : "Copiar clave"}
      </button>
      ${SHORTCUT_URL ? "" : `<p class="card__text">El Atajo todavía no está publicado.</p>`}
    `;
  }
  // 3 · Hay clave pero ya no se ve (se generó en otra visita)
  if (index === 2 && status === "current") {
    return `<p class="card__text">¿No tenés la clave a mano? Generá otra con el botón de abajo.</p>`;
  }
  // 6 · El último dato que llegó
  if (index === 5 && lastImport) {
    return `<p class="perfil__step-result">${escapeHTML(importText(lastImport))}</p>`;
  }
  return "";
}

function keyHTML(value) {
  return `
    <div class="perfil__key" role="status">
      <p class="card__text">Tu clave. Se muestra una sola vez:</p>
      <code class="perfil__token">${escapeHTML(value)}</code>
    </div>
  `;
}

// "Último dato: 8.123 pasos · hoy"
function importText({ date, steps }) {
  const today = todayKey();
  const day = date === today ? "hoy" : date === addDays(today, -1) ? "ayer" : shortDate(date);
  return `Último dato: ${steps.toLocaleString("es-AR")} pasos · ${day}`;
}
