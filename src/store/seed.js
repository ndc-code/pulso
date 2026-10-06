/* ============================================
   Store — Seed
   ============================================ */

// La primera vez que se abre la app no hay hábitos: se guardan los de defecto
// (Ritmo, Fuerza, Comida y Descanso, ver defaults.js).
// (En la Fase 4 lo reemplaza el onboarding, donde se eligen de 3 a 6.)
//
// Migración: si quedan hábitos de una versión anterior, se borran todos
// (con sus registros) y se siembran los de ahora. Se reconocen por su
// source, que ya no existe y no se puede crear a mano:
//   "workout_minutes"  los 6 primeros (Moverme, Agua, Verdura…)
//   "cardio_minutes"   Ritmo por minutos, Fuerza por día y Comida solo agua
// Los entrenos, el agua, las comidas y el sueño no se tocan: son de cada sección.
// Descanso pasó de sí/no a horas: si quedó como "bool", se actualiza en el lugar.
// La meta de sueño pasa de 7 h a 8 h, y al perfil guardado se le suman
// los campos nuevos (por ejemplo meal_goal) con su valor por defecto.
// Se puede quitar cuando no queden datos de esas versiones.

import { get, has, set } from "./store.js";
import { DEFAULTS, DEFAULT_HABITS } from "./defaults.js";

const OLD_SOURCES = ["workout_minutes", "cardio_minutes"];

export async function ensureSeed() {
  if (await has("profile")) {
    const profile = await get("profile");
    const updated = { ...DEFAULTS.profile, ...profile };
    if (updated.sleep_goal === 7) updated.sleep_goal = 8;
    if (JSON.stringify(updated) !== JSON.stringify(profile)) await set("profile", updated);
  }

  if (await has("habit")) {
    const habits = await get("habit");
    const isOldSeed = habits.some((habit) => OLD_SOURCES.includes(habit.source));
    if (!isOldSeed) {
      const sleepAsBool = habits.some((h) => h.source === "sleep" && h.type === "bool");
      if (sleepAsBool) {
        await set("habit", habits.map((h) => (h.source === "sleep" && h.type === "bool" ? { ...h, type: "count", target: 8, unit: "h" } : h)));
      }
      return;
    }
    await set("habit_log", []);
  }

  const habits = DEFAULT_HABITS.map((habit) => ({ id: crypto.randomUUID(), ...habit }));
  await set("habit", habits);
}
