/* ============================================
   Tests — Streaks
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStreak } from "../src/utils/streaks.js";
import { addDays } from "../src/utils/dates.js";

const TODAY = "2026-10-15";

// Arma un historial: "hoy" es el último caracter. x = cumplido, . = fallado, - = no aplica
// Ej: "xx.xx" → hace 4 días cumplido, hace 3 cumplido, hace 2 fallado, ayer cumplido, hoy cumplido
function history(pattern) {
  const days = {};
  [...pattern].reverse().forEach((char, i) => {
    days[addDays(TODAY, -i)] = char;
  });
  return {
    today: TODAY,
    // lo anterior al patrón cuenta como fallado (el hábito no existía)
    isApplicable: (key) => (days[key] ?? ".") !== "-",
    isDone: (key) => days[key] === "x",
  };
}

test("cuenta días cumplidos seguidos", () => {
  assert.equal(computeStreak(history("xxx")), 3);
});

test("hoy sin cumplir todavía no corta la racha", () => {
  assert.equal(computeStreak(history("xxx.")), 3);
});

test("los días que no aplican no cortan ni suman", () => {
  assert.equal(computeStreak(history("xx-x-x")), 4);
});

test("un fallo aislado se perdona (no suma, no corta)", () => {
  // 8 cumplidos, 1 fallo, 3 cumplidos: el fallo es de gracia
  assert.equal(computeStreak(history("xxxxxxxx.xxx")), 11);
});

test("dos fallos dentro de 7 días cortan la racha en el más reciente", () => {
  assert.equal(computeStreak(history("xxxxx.xx.xx")), 2);
});

test("fallos separados por más de 7 días se perdonan los dos", () => {
  assert.equal(computeStreak(history("xxxxxxxx.xxxxxxxx.xx")), 18);
});

test("un hábito recién creado cuenta solo desde que existe", () => {
  // antes del patrón todo es fallo: el primer fallo ya tiene otro fallo atrás
  assert.equal(computeStreak(history("xx")), 2);
  assert.equal(computeStreak(history(".")), 0);
});

test("sin nada cumplido la racha es 0", () => {
  assert.equal(computeStreak(history("....")), 0);
});
