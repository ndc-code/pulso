/* ============================================
   Utils — Chart
   ============================================ */

// Cálculos puros para los ejes de los gráficos. No leen ni guardan nada.
//
//   niceTicks(76.4, 83.1)                     → [77.5, 80, 82.5]   (eje Y)
//   monthTicks("2026-07-05", "2026-10-05")    → ["2026-08-01", "2026-09-01", "2026-10-01"]   (eje X)

// Pasos "redondos" posibles, multiplicados por 1, 10, 100…
const NICE_STEPS = [1, 2, 2.5, 5, 10];

// Unos 3 valores redondos dentro de [min, max] para rotular el eje Y.
// Prueba cada paso redondo y se queda con el que da la cantidad más
// cercana a `count` (si empatan, el paso más grande: números más redondos).
export function niceTicks(min, max, count = 3) {
  if (max <= min) return [min];

  const magnitude = 10 ** Math.floor(Math.log10((max - min) / count));
  let best = null;

  for (const nice of NICE_STEPS) {
    const ticks = ticksEvery(min, max, nice * magnitude);
    if (!best || Math.abs(ticks.length - count) <= Math.abs(best.length - count)) best = ticks;
  }
  return best;
}

// Los múltiplos de `step` entre min y max
function ticksEvery(min, max, step) {
  const ticks = [];
  for (let value = Math.ceil(min / step) * step; value <= max + 1e-9; value += step) {
    ticks.push(Math.round(value * 1000) / 1000); // sin restos de coma flotante
  }
  return ticks;
}

// El día 1 de cada mes que cae después de `first` y hasta `last` (claves "AAAA-MM-DD")
export function monthTicks(first, last) {
  const ticks = [];
  let [year, month] = first.split("-").map(Number);

  while (true) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const key = `${year}-${String(month).padStart(2, "0")}-01`;
    if (key > last) return ticks;
    ticks.push(key);
  }
}
