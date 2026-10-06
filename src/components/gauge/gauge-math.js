/* ============================================
   Components — Gauge Math
   ============================================ */

// Adaptado de gauge-ui (MIT) — https://gauge-ui.dev
// Copyright (c) 2026 Thordur. Portado de TypeScript a JS vanilla.
//
// Geometría pura de los gauges.
// Los ángulos son "grados de gauge": 0 apunta hacia abajo (las 6 en punto)
// y crecen en sentido horario. Un anillo completo que arranca arriba va de 180 a 540.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const round = (n) => Math.round(n * 1000) / 1000;
const fmt = (n) => Number(n.toFixed(3)).toString();

// Punto sobre un círculo de `radius` en un ángulo de gauge
export const polar = (radius, angle) => {
  const theta = ((angle + 90) * Math.PI) / 180;
  return {
    x: round(radius * Math.cos(theta)),
    y: round(radius * Math.sin(theta)),
  };
};

// Valor dentro de [min, max] → ángulo dentro de [startAngle, endAngle]
export const valueToAngle = (value, min, max, startAngle, endAngle) => {
  const span = max - min;
  const t = span === 0 ? 0 : (clamp(value, min, max) - min) / span;
  return startAngle + t * (endAngle - startAngle);
};

// Path SVG de un arco. Los barridos de más de 180° se parten en tramos
// para que un comando "A" nunca sea ambiguo (así un 360° dibuja bien).
export const arcPath = (radius, from, to) => {
  const sweep = Math.min(to - from, 360);
  if (sweep <= 0 || radius <= 0) return "";

  const pieces = Math.max(1, Math.ceil(sweep / 180));
  const step = sweep / pieces;
  const start = polar(radius, from);
  const parts = [`M ${fmt(start.x)} ${fmt(start.y)}`];

  for (let i = 1; i <= pieces; i++) {
    const p = polar(radius, from + step * i);
    parts.push(`A ${fmt(radius)} ${fmt(radius)} 0 0 1 ${fmt(p.x)} ${fmt(p.y)}`);
  }

  return parts.join(" ");
};

// Valores donde se corta el dominio en `segments` partes iguales
// (sin los extremos): 8 vasos de agua → 7 cortes.
export const cutValues = (min, max, segments) => {
  const n = Math.max(1, Math.round(segments));
  return Array.from({ length: n - 1 }, (_, i) => min + ((max - min) * (i + 1)) / n);
};
