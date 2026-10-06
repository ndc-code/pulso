/* ============================================
   Store — Seed
   ============================================ */

// La primera vez que se abre la app no hay hábitos: se guardan los sugeridos.
// (En la Fase 4 lo reemplaza el onboarding, donde se eligen de 3 a 6.)

import { has, set } from "./store.js";
import { DEFAULT_HABITS } from "./defaults.js";

export async function ensureSeed() {
  if (await has("habit")) return;
  const habits = DEFAULT_HABITS.map((habit) => ({ id: crypto.randomUUID(), ...habit }));
  await set("habit", habits);
}
