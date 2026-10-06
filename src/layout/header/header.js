/* ============================================
   Layout — Header
   ============================================ */

// Header de la app: título grande, subtítulo y avatar.
// El subtítulo es la bajada de cada sección ("cardio", "pesas", "tu día"…).
// Escucha el perfil para actualizar la inicial del avatar apenas cambia el nombre.

import { get, subscribe } from "../../store/store.js";

const subtitleEl = document.querySelector("[data-header-subtitle]");
const titleEl = document.querySelector("[data-header-title]");
const initialEl = document.querySelector("[data-avatar-initial]");
const iconEl = document.querySelector("[data-avatar-icon]");
const backEl = document.querySelector("[data-header-back]");

let currentTitle = "";
let currentSubtitle = "";
let profile = null;

export async function initHeader() {
  profile = await get("profile");
  renderAvatar();

  subscribe("profile", (value) => {
    profile = value;
    renderAvatar();
  });
}

// La llama el router en cada cambio de sección.
// `back` (opcional) es el hash al que vuelve la flecha, para subrutas.
export function setHeader({ title, subtitle = "", back = "" }) {
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
  subtitleEl.textContent = currentSubtitle;
}

function renderAvatar() {
  const initial = profile?.name.trim().charAt(0).toUpperCase() ?? "";

  // Con nombre se muestra la inicial; sin nombre, el ícono de usuario.
  // toggleAttribute y no .hidden: en un <svg> la propiedad .hidden no existe.
  initialEl.textContent = initial;
  initialEl.toggleAttribute("hidden", !initial);
  iconEl.toggleAttribute("hidden", Boolean(initial));
}
