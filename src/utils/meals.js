/* ============================================
   Utils — Meals
   ============================================ */

// Cálculos puros sobre comidas (spec 4.3). No leen ni guardan nada.
// Una comida: { id, date, slot, tags[], note }
//
// Puntaje del día (calidad, no calorías), con P = chips positivos y M = a moderar:
//   "good" buen día   P / (P + M) ≥ 70% y al menos 2 positivos
//   "mid"  día medio  entre 40% y 70% (o un buen porcentaje con 1 solo positivo)
//   "low"  día flojo  menos de 40%
//   "none" sin registro
// Nunca se muestra el número: solo el nivel, con palabra.

import { weekKeys, weekdayOf, fromDateKey, startOfWeek, addDays } from "./dates.js";

export const SLOTS = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "merienda", label: "Merienda" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
];

export const POSITIVE_TAGS = [
  { value: "verdura", label: "Verdura" },
  { value: "fruta", label: "Fruta" },
  { value: "legumbre", label: "Legumbre" },
  { value: "integral", label: "Integral" },
  { value: "pescado", label: "Pescado" },
  { value: "frutos_secos", label: "Frutos secos" },
  { value: "aceite_oliva", label: "Aceite de oliva" },
];

export const MODERATE_TAGS = [
  { value: "frito", label: "Frito" },
  { value: "ultraprocesado", label: "Ultraprocesado" },
  { value: "azucar", label: "Azúcar agregada" },
  { value: "embutido", label: "Embutido" },
  { value: "alcohol", label: "Alcohol" },
];

export const LEVEL_LABELS = {
  good: "Buen día",
  mid: "Día medio",
  low: "Día flojo",
  none: "Sin registro",
};

const POSITIVE = new Set(POSITIVE_TAGS.map((t) => t.value));
const MODERATE = new Set(MODERATE_TAGS.map((t) => t.value));

export const tagLabel = (value) =>
  [...POSITIVE_TAGS, ...MODERATE_TAGS].find((t) => t.value === value)?.label ?? value;
export const slotLabel = (value) => SLOTS.find((s) => s.value === value)?.label ?? value;

export function dayScore(meals, dateKey) {
  const ofDay = meals.filter((m) => m.date === dateKey);
  const tags = ofDay.flatMap((m) => m.tags);
  const positives = tags.filter((t) => POSITIVE.has(t)).length;
  const moderates = tags.filter((t) => MODERATE.has(t)).length;
  const total = positives + moderates;

  let level = "none";
  if (total > 0) {
    const share = positives / total;
    if (share >= 0.7 && positives >= 2) level = "good";
    else if (share >= 0.4) level = "mid"; // incluye ≥70% con un solo positivo
    else level = "low";
  }

  return { level, positives, moderates, meals: ofDay.length };
}

// Nivel de cada día de la semana, lunes a domingo
export function weekLevels(meals, today) {
  return weekKeys(today).map((key) => ({
    key,
    weekday: weekdayOf(key),
    dayNumber: fromDateKey(key).getDate(),
    isToday: key === today,
    isFuture: key > today,
    level: key > today ? "none" : dayScore(meals, key).level,
  }));
}

// Chips más usados en la semana de `today`, separados en positivos y a moderar
export function topTags(meals, today) {
  const monday = startOfWeek(today);
  const sunday = addDays(monday, 6);
  const counts = new Map();

  meals
    .filter((m) => m.date >= monday && m.date <= sunday)
    .flatMap((m) => m.tags)
    .forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));

  const sorted = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    positives: sorted.filter((t) => POSITIVE.has(t.tag)),
    moderates: sorted.filter((t) => MODERATE.has(t.tag)),
  };
}

// Momento del día que se sugiere al registrar, según la hora
export function defaultSlot(hour) {
  if (hour >= 6 && hour < 11) return "desayuno";
  if (hour >= 11 && hour < 15) return "almuerzo";
  if (hour >= 15 && hour < 19) return "merienda";
  if (hour >= 19 && hour < 24) return "cena";
  return "snack";
}
