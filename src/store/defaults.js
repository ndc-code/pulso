/* ============================================
   Store — Defaults
   ============================================ */

// Valores iniciales de cada clave, para cuando todavía no hay nada guardado.
// Los campos siguen el modelo de datos de la spec (sección 6),
// más `source` en habit (de dónde sale su valor, ver utils/habits.js).

import { defaultRanges } from "../utils/health.js";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // 0 = domingo

export const DEFAULTS = {
  profile: {
    id: "local",
    name: "",
    goal: null,              // "move" | "eat" | "sleep" | "all"
    units: "metric",
    theme: "system",         // "system" | "light" | "dark"
    weekly_active_goal: 150, // minutos por semana (OMS)
    water_goal: 8,           // vasos por día
    sleep_goal: 7,           // horas por noche
  },

  // Colecciones: arrancan vacías.
  // `habit` no tiene default a propósito: lo siembra seed.js la primera vez.
  habit_log: [],
  water_log: [],
  workout: [],
  meal: [],
  sleep: [],
  mood: [],
  lab_result: [],
  body: [],

  // Rangos de referencia de los análisis (editables en Progreso).
  // No es una tabla de la spec: en Supabase va como columna jsonb del perfil o tabla propia.
  lab_range: defaultRanges(),
};

// Hábitos sugeridos (spec 4.1). Sin id: se lo pone seed.js al guardarlos.
export const DEFAULT_HABITS = [
  { name: "Moverme", icon: "footprints", color: "orange", type: "count", target: 30, unit: "min", source: "workout_minutes" },
  { name: "Agua", icon: "droplet", color: "blue", type: "count", target: 8, unit: "vasos", source: "water" },
  { name: "Verdura en 2 comidas", icon: "salad", color: "green", type: "count", target: 2, unit: "comidas", source: "meal_veggies" },
  { name: "Sin ultraprocesados", icon: "leaf", color: "amber", type: "bool", target: 1, unit: "", source: null },
  { name: "Dormir 7 h o más", icon: "moon", color: "violet", type: "bool", target: 1, unit: "", source: "sleep" },
  { name: "Pausa / respiración", icon: "wind", color: "rose", type: "bool", target: 1, unit: "", source: "breathing" },
].map((habit, index) => ({ ...habit, days: ALL_DAYS, order: index, archived: false }));
