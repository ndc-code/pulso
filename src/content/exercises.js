/* ============================================
   Content — Exercises
   ============================================ */

// Biblioteca base de ejercicios de fuerza (Fuerza → Ejercicios).
// Lista propia, escrita a mano: nombre en español, grupo muscular y equipo.
// Los ejercicios que crea la persona se guardan aparte (store: "ejercicio").

export const GROUPS = ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Core"];
export const EQUIPMENT = ["Barra", "Mancuernas", "Máquina", "Polea", "Peso corporal", "Kettlebell"];

export const EXERCISES = [
  // Pecho
  { nombre: "Press de banca", grupo: "Pecho", equipo: "Barra" },
  { nombre: "Press inclinado con mancuernas", grupo: "Pecho", equipo: "Mancuernas" },
  { nombre: "Press de pecho en máquina", grupo: "Pecho", equipo: "Máquina" },
  { nombre: "Aperturas con mancuernas", grupo: "Pecho", equipo: "Mancuernas" },
  { nombre: "Cruce de poleas", grupo: "Pecho", equipo: "Polea" },
  { nombre: "Flexiones de brazos", grupo: "Pecho", equipo: "Peso corporal" },

  // Espalda
  { nombre: "Dominadas", grupo: "Espalda", equipo: "Peso corporal" },
  { nombre: "Jalón al pecho", grupo: "Espalda", equipo: "Polea" },
  { nombre: "Remo con barra", grupo: "Espalda", equipo: "Barra" },
  { nombre: "Remo con mancuerna", grupo: "Espalda", equipo: "Mancuernas" },
  { nombre: "Remo sentado en polea", grupo: "Espalda", equipo: "Polea" },
  { nombre: "Peso muerto", grupo: "Espalda", equipo: "Barra" },

  // Piernas
  { nombre: "Sentadilla", grupo: "Piernas", equipo: "Barra" },
  { nombre: "Sentadilla goblet", grupo: "Piernas", equipo: "Kettlebell" },
  { nombre: "Prensa de piernas", grupo: "Piernas", equipo: "Máquina" },
  { nombre: "Peso muerto rumano", grupo: "Piernas", equipo: "Barra" },
  { nombre: "Estocadas", grupo: "Piernas", equipo: "Mancuernas" },
  { nombre: "Sentadilla búlgara", grupo: "Piernas", equipo: "Mancuernas" },
  { nombre: "Extensión de cuádriceps", grupo: "Piernas", equipo: "Máquina" },
  { nombre: "Curl femoral", grupo: "Piernas", equipo: "Máquina" },
  { nombre: "Hip thrust", grupo: "Piernas", equipo: "Barra" },
  { nombre: "Elevación de talones", grupo: "Piernas", equipo: "Máquina" },

  // Hombros
  { nombre: "Press militar", grupo: "Hombros", equipo: "Barra" },
  { nombre: "Press de hombros con mancuernas", grupo: "Hombros", equipo: "Mancuernas" },
  { nombre: "Elevaciones laterales", grupo: "Hombros", equipo: "Mancuernas" },
  { nombre: "Face pull", grupo: "Hombros", equipo: "Polea" },
  { nombre: "Pájaros", grupo: "Hombros", equipo: "Mancuernas" },

  // Brazos
  { nombre: "Curl de bíceps con barra", grupo: "Brazos", equipo: "Barra" },
  { nombre: "Curl martillo", grupo: "Brazos", equipo: "Mancuernas" },
  { nombre: "Extensión de tríceps en polea", grupo: "Brazos", equipo: "Polea" },
  { nombre: "Fondos en paralelas", grupo: "Brazos", equipo: "Peso corporal" },
  { nombre: "Press francés", grupo: "Brazos", equipo: "Barra" },

  // Core
  { nombre: "Plancha", grupo: "Core", equipo: "Peso corporal" },
  { nombre: "Plancha lateral", grupo: "Core", equipo: "Peso corporal" },
  { nombre: "Dead bug", grupo: "Core", equipo: "Peso corporal" },
  { nombre: "Pallof press", grupo: "Core", equipo: "Polea" },
  { nombre: "Paseo del granjero", grupo: "Core", equipo: "Kettlebell" },
];

// Rutinas sugeridas para la primera vez (las guarda store/seed.js).
// Cuerpo completo 3 días: lunes y viernes A, miércoles B.
export const SUGGESTED_ROUTINES = [
  {
    nombre: "Cuerpo completo A",
    dias: [1, 5],
    ejercicios: [
      { nombre: "Sentadilla", series: 3, reps: 8, descansoSeg: 120 },
      { nombre: "Press de banca", series: 3, reps: 8, descansoSeg: 120 },
      { nombre: "Remo con barra", series: 3, reps: 10, descansoSeg: 90 },
      { nombre: "Elevaciones laterales", series: 3, reps: 12, descansoSeg: 60 },
      { nombre: "Plancha", series: 3, reps: 30, descansoSeg: 60 },
    ],
  },
  {
    nombre: "Cuerpo completo B",
    dias: [3],
    ejercicios: [
      { nombre: "Peso muerto rumano", series: 3, reps: 8, descansoSeg: 120 },
      { nombre: "Press militar", series: 3, reps: 8, descansoSeg: 120 },
      { nombre: "Jalón al pecho", series: 3, reps: 10, descansoSeg: 90 },
      { nombre: "Estocadas", series: 3, reps: 10, descansoSeg: 90 },
      { nombre: "Curl martillo", series: 3, reps: 12, descansoSeg: 60 },
    ],
  },
];
