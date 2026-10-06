/* ============================================
   Layout — Header
   ============================================ */

// Header de la app: título grande, subtítulo y avatar.
//   - En Hoy el subtítulo es el saludo: "Buen día, Nico" (la fecha está en la tira de la semana).
//   - En el resto, el subtítulo es la bajada de la sección ("Sueño y estrés").
// Escucha el perfil para actualizar saludo e inicial apenas cambia el nombre.

import { get, subscribe } from "../../store/store.js";
import { greeting } from "../../utils/dates.js";

const subtitleEl = document.querySelector("[data-header-subtitle]");
const titleEl = document.querySelector("[data-header-title]");
const initialEl = document.querySelector("[data-avatar-initial]");
const iconEl = document.querySelector("[data-avatar-icon]");
const backEl = document.querySelector("[data-header-back]");

let currentRoute = null;
let currentTitle = "";
let currentSubtitle = "";
let profile = null;

export async function initHeader() {
  profile = await get("profile");
  renderAvatar();

  subscribe("profile", (value) => {
    profile = value;
    renderAvatar();
    renderTitle();
  });
}

// La llama el router en cada cambio de sección.
// `back` (opcional) es el hash al que vuelve la flecha, para subrutas.
export function setHeader(routeName, { title, subtitle = "", back = "" }) {
  currentRoute = routeName;
  currentTitle = title;
  currentSubtitle = subtitle;
  backEl.toggleAttribute("hidden", !back);
  if (back) backEl.href = back;
  renderTitle();
}

// Después de navegar, el foco va al título: el lector de pantalla
// anuncia en qué sección estás
export function focusHeaderTitle() {
  titleEl.focus({ preventScroll: true });
}

function renderTitle() {
  titleEl.textContent = currentTitle;

  if (currentRoute === "hoy") {
    const name = profile?.name.trim();
    subtitleEl.textContent = name ? `${greeting()}, ${name}` : greeting();
  } else {
    subtitleEl.textContent = currentSubtitle;
  }
}

function renderAvatar() {
  const initial = profile?.name.trim().charAt(0).toUpperCase() ?? "";

  // Con nombre se muestra la inicial; sin nombre, el ícono de usuario.
  // toggleAttribute y no .hidden: en un <svg> la propiedad .hidden no existe.
  initialEl.textContent = initial;
  initialEl.toggleAttribute("hidden", !initial);
  iconEl.toggleAttribute("hidden", Boolean(initial));
}
