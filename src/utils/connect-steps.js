/* ============================================
   Utils — Connect Steps
   ============================================ */

// Lógica de la guía "Conectá tu iPhone" (Perfil › Cuenta › Conexiones).
//
//   lastHealthImport(stepLogs)   → { date, steps } del último día que mandó el Atajo, o null
//   connectSteps({ signedIn, hasKey, lastImport })
//     → { status: ["done" | "current" | "todo", ...6], connected }
//
// Los 6 pasos: 1 entrar con Google · 2 generar la clave · 3 instalar el Atajo ·
// 4 pegar la clave y permitir Salud · 5 hacerlo automático · 6 probarlo.
// Del 3 al 6 pasan en el iPhone y la app no los ve uno por uno: se dan por
// hechos cuando llega el primer dato del Atajo.

// Las filas de steps_log que escribe el Atajo llevan source: "salud"
// (las que se cargan a mano en Ritmo, source: "manual")
export function lastHealthImport(stepLogs) {
  let last = null;
  for (const row of stepLogs ?? []) {
    if (row.source !== "salud") continue;
    if (last === null || row.date > last.date) last = row;
  }
  return last ? { date: last.date, steps: last.steps } : null;
}

// hasKey: true / false / null (no se pudo saber: no se da por hecho)
export function connectSteps({ signedIn, hasKey, lastImport }) {
  const arrived = signedIn && lastImport !== null;
  const done = [
    signedIn,
    signedIn && (hasKey === true || arrived),
    arrived,
    arrived,
    arrived,
    arrived,
  ];

  const current = done.indexOf(false); // el primero sin hacer (-1 = todos hechos)
  const status = done.map((isDone, index) => (isDone ? "done" : index === current ? "current" : "todo"));
  return { status, connected: current === -1 };
}
