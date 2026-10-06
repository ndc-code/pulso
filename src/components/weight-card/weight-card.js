/* ============================================
   Components — Weight Card
   ============================================ */

// Tarjeta "Pérdida de peso" (como la card "Body weight" de openGym, escrita
// desde cero): el último peso en grande con la flecha contra el pesaje
// anterior y su fecha, la meta y cuánto falta, el gráfico con la meta
// punteada y el link a todos los pesajes. Se usa en Pulso (Hoy) y en Fuerza.
//
//   weightCard({ body, goal, id: "hoy-weight" })
//
// Los botones llevan data-weight="log" (registrar) y data-weight="all"
// (todos los pesajes); la vista escucha con views/hoy/weight-actions.js.

import { bodySeries, weightProgress } from "../../utils/health.js";
import { fromDateKey, shortDate } from "../../utils/dates.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { lineChart } from "../line-chart/line-chart.js";

const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const DAY = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" });
const kg = (n) => `${decimal.format(Math.abs(n))} kg`;

export function weightCard({ body, goal, id }) {
  const progress = weightProgress(body, goal);
  const titleId = `${id}-title`;

  return `
    <section class="card weight-card" aria-labelledby="${titleId}">
      <div class="card__header">
        <h2 class="card__title" id="${titleId}">Pérdida de peso</h2>
        <button class="btn btn--text weight-card__log" type="button" data-weight="log">${icon("plus")}Registrar</button>
      </div>
      ${progress ? content(body, goal, progress) : `<p class="card__text">Registrá tu peso de vez en cuando para ver cómo cambia con los hábitos.</p>`}
    </section>
  `;
}

function content(body, goal, { latest, start, change, lastChange, toGoal, reached }) {
  // Flecha contra el pesaje anterior: ↓ bajaste (naranja: va hacia la meta), ↑ subiste
  let delta = "";
  if (lastChange) {
    const down = lastChange < 0;
    delta = `
      <span class="weight-card__delta${down ? " is-down" : ""}">
        <span aria-hidden="true">${down ? "↓" : "↑"}</span>
        ${decimal.format(Math.abs(lastChange))}
        <span class="visually-hidden">kg ${down ? "menos" : "más"} que el pesaje anterior</span>
      </span>
    `;
  }

  const lines = [];
  if (goal != null) lines.push(reached ? `Llegaste a tu meta de ${kg(goal)}.` : `Meta ${kg(goal)} · faltan ${kg(toGoal)}`);
  if (latest !== start && change !== 0) {
    lines.push(`${change < 0 ? "Bajaste" : "Subiste"} ${kg(change)} desde el ${shortDate(start.date)}.`);
  }

  return `
    <div class="weight-card__head">
      <p class="weight-card__value">
        <span class="num num--md">${decimal.format(latest.weight)}</span>
        <span class="weight-card__unit">kg</span>
        ${delta}
      </p>
      <p class="label">${escapeHTML(DAY.format(fromDateKey(latest.date)).replace(/\./g, ""))}</p>
    </div>
    ${lines.length ? `<p class="label">${lines.map(escapeHTML).join("<br />")}</p>` : ""}
    ${lineChart({
      points: bodySeries(body, "weight"),
      unit: "kg",
      format: (n) => decimal.format(n),
      limits: goal != null ? [{ value: goal, label: decimal.format(goal) }] : [],
      axes: true,
    })}
    <button class="btn btn--text weight-card__all" type="button" data-weight="all">
      Todos los pesajes${icon("chevron-left", "weight-card__chevron")}
    </button>
  `;
}
