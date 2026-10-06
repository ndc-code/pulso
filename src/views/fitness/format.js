/* ============================================
   Views — Fitness Format
   ============================================ */

// Textos chicos que se repiten en los tabs y hojas de Fuerza.

import { weekdayOf, fromDateKey, shortDate, addDays, WEEKDAY_NAMES } from "../../utils/dates.js";

const kg = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

// 82.5 → "82,5" · 12500 → "12.500"
export const formatKg = (value) => kg.format(value);

// "lunes" → "Lunes"
export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// "hoy" · "ayer" · "lunes 5" (esta semana) · "28 sept" (antes)
export function dayLabel(key, today) {
  if (key === today) return "hoy";
  if (key === addDays(today, -1)) return "ayer";
  if (key > addDays(today, -7)) return `${WEEKDAY_NAMES[weekdayOf(key)]} ${fromDateKey(key).getDate()}`;
  return shortDate(key);
}

// Series hechas en una línea: "80×8 · 80×8 · 85×6"
export const setsLine = (series) => series.map((s) => `${formatKg(s.peso)}×${s.reps}`).join(" · ");
