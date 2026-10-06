/* ============================================
   Utils — Dates
   ============================================ */

// Fechas de la app.
//
// Un día se guarda como texto "AAAA-MM-DD" en hora LOCAL (lo llamamos "clave de día").
// No se usa toISOString() porque está en UTC: en Argentina, a las 21 h
// ya devolvería el día siguiente.

const LOCALE = "es-AR";

// Letras de los días, en el orden de getDay(): 0 = domingo
// (miércoles es "X" para no confundirlo con martes)
export const WEEKDAY_LETTERS = ["D", "L", "M", "X", "J", "V", "S"];
export const WEEKDAY_SHORT = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
export const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Orden de la semana en pantalla: lunes a domingo
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Date → "2026-10-05"
export function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "2026-10-05" → Date a las 12 del mediodía local
// (el mediodía evita sorpresas con los cambios de horario)
export function fromDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function addDays(key, amount) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

// 0 = domingo ... 6 = sábado
export function weekdayOf(key) {
  return fromDateKey(key).getDay();
}

// Lunes de la semana de esa fecha
export function startOfWeek(key) {
  const offset = (weekdayOf(key) + 6) % 7; // lunes → 0, domingo → 6
  return addDays(key, -offset);
}

// Las 7 claves de la semana, de lunes a domingo
export function weekKeys(key) {
  const monday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// "5 oct"
export function shortDate(key) {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" })
    .format(fromDateKey(key))
    .replace(".", "");
}

// "lunes, 5 de octubre"
export function longDate(date = new Date()) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
