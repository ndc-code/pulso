/* ============================================
   Views — Progreso
   ============================================ */

// Salud y evolución (spec 4.5):
//   1. resumen de la semana en filas tipográficas: hábitos, minutos activos,
//      días buenos en Comer y promedio de sueño
//   2. calendario de constancia: un punto por día, en niveles de naranja
//   3. peso (y cintura) con su gráfico de evolución
//   4. análisis clínicos: un dial de rango por indicador, la evolución del
//      que se elija y los rangos de referencia editables
//   5. Lp(a) aparte, con su nota de contexto
//   6. historial de análisis y el aviso fijo

import { get, remove, subscribe } from "../../store/store.js";
import { HABIT_KEYS, loadHabitContext } from "../../store/habits.js";
import { todayKey, fromDateKey, shortDate } from "../../utils/dates.js";
import { weeklyReport, consistencyGrid } from "../../utils/progress.js";
import { hoursClock } from "../../utils/sleep.js";
import {
  LAB_INDICATORS,
  indicator,
  defaultRanges,
  labStatus,
  labSeries,
  latestLab,
  rangeLabel,
  bodySeries,
  bodyTrend,
} from "../../utils/health.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { statRow } from "../../components/stat-row/stat-row.js";
import { levelMark } from "../../components/level/level.js";
import { rangeDial } from "../../components/range-dial/range-dial.js";
import { lineChart } from "../../components/line-chart/line-chart.js";
import { chipGroup } from "../../components/chip/chip.js";
import { toast } from "../../components/toast/toast.js";
import { openBodyForm } from "./body-form.js";
import { openLabForm } from "./lab-form.js";
import { openRangeForm } from "./range-form.js";

export const title = "Progreso";
export const subtitle = "Salud y evolución";

const GRID_WEEKS = 26; // calendario de constancia: últimos 6 meses
const MONTH_SHORT = new Intl.DateTimeFormat("es-AR", { month: "short" });
const FULL_DATE = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" });
const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

const STATUS_LABELS = { in: "En rango", high: "Arriba del rango", low: "Debajo del rango" };

export async function render(root) {
  const today = todayKey();
  let labs = [];
  let body = [];
  let ranges = {};
  let chartKey = null; // indicador elegido para el gráfico de evolución
  let focusAfterPaint = null;

  async function paint() {
    const [ctx, storedLabs, storedBody, storedRanges] = await Promise.all([
      loadHabitContext(), get("lab_result"), get("body"), get("lab_range"),
    ]);
    labs = storedLabs ?? [];
    body = storedBody ?? [];
    // los rangos guardados pisan a los de arranque (así un indicador nuevo también tiene rango)
    ranges = { ...defaultRanges(), ...storedRanges };

    const report = weeklyReport(ctx, today);
    const goal = ctx.profile.weekly_active_goal;
    const grid = consistencyGrid(ctx.habits, today, ctx, GRID_WEEKS);
    const completeDays = grid.flat().filter((d) => d.level === "good").length;

    // Indicadores con algún valor cargado (sin la Lp(a), que va aparte)
    const measured = LAB_INDICATORS.filter((i) => !i.genetic && latestLab(labs, i.key));
    if (!measured.some((i) => i.key === chartKey)) chartKey = measured[0]?.key ?? null;

    root.innerHTML = `
      <section class="stat-rows content-reveal-stagger" aria-labelledby="progress-week-title">
        <h2 class="eyebrow progress-eyebrow" id="progress-week-title">Esta semana</h2>
        ${statRow({
          value: report.habits.percent,
          unit: "%",
          size: "xl",
          copy: report.habits.total
            ? ["de tus hábitos cumplidos.", `${report.habits.done} de ${report.habits.total}, de lunes a hoy.`]
            : ["de tus hábitos cumplidos.", "Sin hábitos para esta semana."],
          bar: report.habits.percent,
        })}
        ${statRow({
          value: report.minutes,
          unit: "min",
          copy: ["activos.", `Meta: ${goal} por semana.`],
          bar: goal ? (report.minutes / goal) * 100 : 0,
        })}
        ${statRow({
          value: report.goodFoodDays,
          copy: [
            report.goodFoodDays === 1 ? "día bueno en Comer." : "días buenos en Comer.",
            report.foodDays ? `De ${report.foodDays} con comidas registradas.` : "Todavía sin comidas.",
          ],
        })}
        ${statRow({
          value: report.sleepAverage === null ? "–:––" : hoursClock(report.sleepAverage),
          unit: report.sleepAverage === null ? "" : "h",
          copy: [
            "de sueño promedio.",
            report.sleepNights ? `${report.sleepNights} ${report.sleepNights === 1 ? "noche registrada" : "noches registradas"}.` : "Todavía sin noches.",
          ],
        })}
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="progress-grid-title">
        <div class="card__header">
          <h2 class="eyebrow" id="progress-grid-title">Constancia · 6 meses</h2>
          <p class="label">${completeDays} ${completeDays === 1 ? "día completo" : "días completos"}</p>
        </div>
        ${heatmap(grid)}
        <p class="visually-hidden">${completeDays} días con todos los hábitos cumplidos en los últimos 6 meses.</p>
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="progress-body-title">
        <div class="card__header">
          <h2 class="card__title" id="progress-body-title">Peso</h2>
          <button class="btn btn--text" type="button" data-open="body">Registrar</button>
        </div>
        ${weightBlock(body, today)}
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="progress-labs-title">
        <div class="card__header">
          <h2 class="card__title" id="progress-labs-title">Análisis clínicos</h2>
          <button class="btn btn--text" type="button" data-open="ranges">Rangos</button>
        </div>
        ${labsBlock(labs, ranges, measured, chartKey)}
        <button class="btn btn--primary btn--block" type="button" data-open="lab">${icon("plus")}Cargar análisis</button>
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="progress-lpa-title">
        <h2 class="card__title" id="progress-lpa-title">Lp(a)</h2>
        ${lpaBlock(labs, ranges)}
      </section>

      <section class="card" aria-labelledby="progress-history-title">
        <h2 class="card__title" id="progress-history-title" tabindex="-1">Historial de análisis</h2>
        ${labHistory(labs)}
      </section>

      <p class="progreso__notice">Pulso no reemplaza el consejo médico.</p>
    `;

    const target = focusAfterPaint;
    focusAfterPaint = null;
    if (target) root.querySelector(target)?.focus();
  }

  root.addEventListener("click", async (event) => {
    const open = event.target.closest("[data-open]")?.dataset.open;
    if (open === "body") {
      const latest = bodyTrend(body, today)?.latest;
      openBodyForm({ weight: latest?.weight ?? "", waist: latest?.waist ?? "" });
      return;
    }
    if (open === "lab") {
      openLabForm();
      return;
    }
    if (open === "ranges") {
      openRangeForm(ranges);
      return;
    }

    const del = event.target.closest("[data-delete-lab]");
    if (del) {
      const lab = labs.find((l) => l.id === del.dataset.deleteLab);
      if (!confirm(`¿Borrar el análisis del ${FULL_DATE.format(fromDateKey(lab.date))}?`)) return;
      focusAfterPaint = "#progress-history-title";
      await remove("lab_result", lab.id);
      toast("Análisis borrado");
    }
  });

  // Elegir qué indicador se ve en el gráfico de evolución
  root.addEventListener("change", (event) => {
    if (event.target.name !== "chart") return;
    chartKey = event.target.value;
    focusAfterPaint = `[name="chart"][value="${chartKey}"]`;
    paint();
  });

  const keys = [...HABIT_KEYS, "lab_result", "body", "lab_range"];
  const offs = keys.map((key) => subscribe(key, paint));

  await paint();
  return () => offs.forEach((off) => off());
}

/* ---------------------------------------- */
/* Calendario de constancia */
/* ---------------------------------------- */

// Una columna por semana, una fila por día; arriba, el mes cuando cambia.
// Niveles: lleno = todos los hábitos · a medias = la mitad o más · aro = alguno · gris = ninguno
function heatmap(grid) {
  let lastMonth = null;
  const months = grid
    .map((week) => {
      const date = fromDateKey(week[0].key);
      const label = date.getMonth() !== lastMonth ? MONTH_SHORT.format(date).replace(".", "") : "";
      lastMonth = date.getMonth();
      return `<span>${label}</span>`;
    })
    .join("");

  const cells = grid
    .flat()
    .map((day) => {
      const classes = ["heat__cell", day.isToday && "is-today", day.isFuture && "is-future"].filter(Boolean).join(" ");
      return `<span class="${classes}" data-level="${day.level}"></span>`;
    })
    .join("");

  const legend = [
    ["none", "Nada"],
    ["low", "Algo"],
    ["mid", "La mitad"],
    ["good", "Todo"],
  ]
    .map(([level, text]) => `<span class="heat__key"><span class="heat__cell" data-level="${level}"></span>${text}</span>`)
    .join("");

  return `
    <div class="heat" aria-hidden="true" style="--weeks: ${grid.length}">
      <div class="heat__months">${months}</div>
      <div class="heat__grid">${cells}</div>
      <div class="heat__legend">${legend}</div>
    </div>
  `;
}

/* ---------------------------------------- */
/* Peso */
/* ---------------------------------------- */

function weightBlock(body, today) {
  const trend = bodyTrend(body, today);
  if (!trend) {
    return `<p class="card__text">Registrá tu peso de vez en cuando para ver cómo cambia con los hábitos.</p>`;
  }

  const { latest, delta, since } = trend;
  let change = "Primer registro.";
  if (delta !== null) {
    const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
    change = delta === 0 ? `Igual que el ${shortDate(since)}.` : `${sign}${decimal.format(Math.abs(delta))} kg desde el ${shortDate(since)}.`;
  }
  const waist = bodySeries(body, "waist").at(-1);

  return `
    <div class="progress-figure">
      <p class="stat-row__value">
        <span class="num num--md">${decimal.format(latest.weight)}</span>
        <span class="stat-row__unit">kg</span>
      </p>
      <p class="label">
        ${escapeHTML(change)}<br />
        ${waist ? `Cintura: ${decimal.format(waist.value)} cm.` : `Último: ${escapeHTML(shortDate(latest.date))}.`}
      </p>
    </div>
    ${lineChart({ points: bodySeries(body, "weight"), unit: "kg", format: (n) => decimal.format(n) })}
  `;
}

/* ---------------------------------------- */
/* Análisis */
/* ---------------------------------------- */

function labsBlock(labs, ranges, measured, chartKey) {
  if (!measured.length) {
    return `<p class="card__text">Cargá los valores de tu último análisis de sangre para seguir su evolución.</p>`;
  }

  const lastDate = [...labs].map((l) => l.date).sort().at(-1);
  const tiles = LAB_INDICATORS.filter((i) => !i.genetic).map((i) => labTile(i, latestLab(labs, i.key), ranges[i.key])).join("");

  const chosen = indicator(chartKey);
  const range = ranges[chartKey];
  const limits = [range.low, range.high]
    .filter((v) => v != null)
    .map((v) => ({ value: v, label: decimal.format(v) }));

  return `
    <p class="label">Último análisis: ${escapeHTML(FULL_DATE.format(fromDateKey(lastDate)))}</p>
    <ul class="lab-tiles">${tiles}</ul>

    <div class="lab-chart">
      ${chipGroup({
        name: "chart",
        legend: "Evolución",
        type: "radio",
        values: [chartKey],
        options: measured.map((i) => ({ value: i.key, label: i.label })),
      })}
      <p class="label">${escapeHTML(chosen.name)} · ${escapeHTML(chosen.unit)} · referencia ${escapeHTML(rangeLabel(range))}</p>
      ${lineChart({ points: labSeries(labs, chartKey), unit: chosen.unit, limits, format: (n) => decimal.format(n) })}
    </div>
  `;
}

function labTile(ind, latest, range) {
  const status = labStatus(latest?.value, range);
  const value = latest ? decimal.format(latest.value) : "—";
  const statusText = latest ? (status ? STATUS_LABELS[status] : "Sin rango") : "Sin dato";
  const level = status === "in" ? "good" : status ? "low" : "none";

  return `
    <li class="lab-tile">
      <p class="lab-tile__label">${escapeHTML(ind.label)}</p>
      ${rangeDial({
        value: latest?.value,
        scale: ind.scale,
        range,
        status,
        label: `${ind.name}: ${value} ${ind.unit}. ${statusText}, referencia ${rangeLabel(range)}`,
      })}
      <p class="stat-row__value">
        <span class="num num--sm">${value}</span>
        <span class="lab-tile__unit">${escapeHTML(ind.unit)}</span>
      </p>
      <p class="lab-tile__status">${levelMark(level)}${statusText}</p>
      <p class="lab-tile__ref">Ref. ${escapeHTML(rangeLabel(range))}</p>
    </li>
  `;
}

// Lp(a): se muestra aparte, con contexto, para que no frustre ver que no baja
function lpaBlock(labs, ranges) {
  const ind = indicator("lpa");
  const latest = latestLab(labs, "lpa");
  const range = ranges.lpa;
  const status = labStatus(latest?.value, range);

  return `
    ${latest
      ? `
        <div class="progress-figure">
          <p class="stat-row__value">
            <span class="num num--md">${decimal.format(latest.value)}</span>
            <span class="stat-row__unit">${escapeHTML(ind.unit)}</span>
          </p>
          <p class="label">
            ${status ? STATUS_LABELS[status] : "Sin rango"} · ref. ${escapeHTML(rangeLabel(range))}<br />
            Medida el ${escapeHTML(shortDate(latest.date))}.
          </p>
        </div>`
      : ""}
    <p class="card__text">
      La Lp(a) depende sobre todo de la genética: los hábitos casi no la cambian.
      Alcanza con medirla una vez para conocer tu riesgo, y si sale alta conviene
      cuidar todavía más el resto de los valores. Que no baje no quiere decir que
      lo estés haciendo mal.
    </p>
  `;
}

function labHistory(labs) {
  if (!labs.length) {
    return `<p class="card__text">Todavía no cargaste análisis.</p>`;
  }

  const sorted = [...labs].sort((a, b) => (a.date < b.date ? 1 : -1));

  return `
    <ul class="list">
      ${sorted
        .map((lab) => {
          const date = FULL_DATE.format(fromDateKey(lab.date));
          const values = [
            ...LAB_INDICATORS.filter((i) => lab[i.key] != null).map((i) => `${i.label} ${decimal.format(lab[i.key])}`),
            ...Object.entries(lab.extra ?? {}).map(([name, value]) => `${name} ${decimal.format(value)}`),
          ].join(" · ");

          return `
            <li class="list-row">
              <span class="list-row__body">
                <span class="list-row__title">${escapeHTML(date)}</span>
                <span class="list-row__detail">${escapeHTML(values)}</span>
              </span>
              <span class="list-row__actions">
                <button class="btn btn--icon" type="button" data-delete-lab="${escapeHTML(lab.id)}"
                  aria-label="Borrar el análisis del ${escapeHTML(date)}">${icon("trash-2")}</button>
              </span>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}
