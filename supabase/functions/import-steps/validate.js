/* ============================================
   Utils — Import Steps Validate
   ============================================ */

// Valida lo que manda el Atajo: { date: "AAAA-MM-DD", steps: 8123 }.
// JS puro (sin Deno ni Node) para poder testearlo con node:test.
//
//   validateStepsPayload(body)  → { ok: true, date, steps } | { ok: false, error }

const DAY = 86_400_000;
const MAX_STEPS = 100_000;
const MAX_DAYS_BACK = 30;

const fail = (error) => ({ ok: false, error });

export function validateStepsPayload(body, now = new Date()) {
  if (body === null || typeof body !== "object") return fail("El cuerpo tiene que ser { date, steps }.");

  const { date } = body;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail("La fecha tiene que ser AAAA-MM-DD.");
  }
  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    return fail("La fecha no existe.");
  }

  // La fecha es la del iPhone (hora local): se tolera un día de diferencia con UTC
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysFromToday = Math.round((day.getTime() - today) / DAY);
  if (daysFromToday > 1) return fail("La fecha no puede ser futura.");
  if (daysFromToday < -MAX_DAYS_BACK) return fail(`La fecha es de hace más de ${MAX_DAYS_BACK} días.`);

  // Texto solo si son dígitos: "8.123" podría ser 8123 u 8,123 según el idioma del iPhone
  const steps = typeof body.steps === "string" && /^\d+$/.test(body.steps) ? Number(body.steps) : body.steps;
  if (typeof steps !== "number" || !Number.isFinite(steps)) return fail("Los pasos tienen que ser un número.");

  const rounded = Math.round(steps);
  if (rounded < 0 || rounded > MAX_STEPS) return fail("Los pasos tienen que estar entre 0 y 100.000.");

  return { ok: true, date, steps: rounded };
}
