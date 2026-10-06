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
    meal_goal: 4,            // comidas registradas por día (hábito Comida)
    sleep_goal: 8,           // horas por noche (meta del hábito Descanso)
    weight_goal: null,       // kg; se edita al registrar el peso (null = sin meta)
  },

  // Colecciones: arrancan vacías.
  // `habit` no tiene default a propósito: lo siembra seed.js la primera vez.
  habit_log: [],
  water_log: [],
  steps_log: [],           // pasos del día: { date, steps } (por ahora a mano, después desde Salud)
  workout: [],
  meal: [],
  sleep: [],
  mood: [],
  lab_result: [],
  body: [],

  // Objetivos de la semana y del sueño. Se ven y se editan en cada sección
  // (Ritmo, Fuerza, Descanso); Pulso muestra el avance contra todos.
  objetivos: {
    cardioMinSemana: 150,   // minutos de cardio por semana (OMS)
    fuerzaDiasSemana: 3,    // días de pesas por semana
    horasSueno: 8,
    horaAcostarse: "23:00",
    horaLevantarse: "07:00",
  },

  // Fuerza. `rutina` no tiene default a propósito: lo siembra seed.js la primera vez.
  sesion_fuerza: [],
  ejercicio: [],           // ejercicios propios (la biblioteca base está en content/exercises.js)
  entreno_actual: null,    // entrenamiento en curso, o null

  // Rangos de referencia de los análisis (editables en Progreso).
  // No es una tabla de la spec: en Supabase va como columna jsonb del perfil o tabla propia.
  lab_range: defaultRanges(),
};

// Hábitos por defecto: uno por sección de la barra, en su orden. Todos se
// completan solos con lo que se registra en cada sección (ver utils/habits.js).
// Las metas de Fuerza y Comida salen de objetivos y del perfil, no de `target`.
// Sin id: se lo pone seed.js.
export const DEFAULT_HABITS = [
  { name: "Ritmo", icon: "footprints", color: "orange", type: "count", target: 8000, unit: "pasos", source: "steps" },
  { name: "Fuerza", icon: "dumbbell", color: "amber", type: "count", target: 3, unit: "días", source: "strength_week" },
  { name: "Comida", icon: "apple", color: "green", type: "count", target: 2, unit: "", source: "food" },
  { name: "Descanso", icon: "moon", color: "violet", type: "count", target: 8, unit: "h", source: "sleep" },
].map((habit, index) => ({ ...habit, days: ALL_DAYS, order: index, archived: false }));
