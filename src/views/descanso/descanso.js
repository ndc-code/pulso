/* ============================================
   Views — Descanso
   ============================================ */

// Sueño y estrés (spec 4.4):
//   1. filas tipográficas: horas de anoche (con su nivel) y el promedio de la semana
//   2. card de anoche (como "Sleep" de gauge-ui): reloj de 24 h con la noche
//      en un arco, datos al costado y el botón para registrar o editar
//   3. la semana: barras de horas con la referencia de la meta de sueño
//   4. respiración guiada 4-4-4-4 o 4-7-8 (marca el hábito de pausa)
//   5. check-in opcional de ánimo y energía
//   6. historial de noches
// Con la meta de sueño o más, el hábito Descanso se marca solo
// (lo calcula utils/habits.js a partir del registro de sueño).

import { get, remove, subscribe } from "../../store/store.js";
import { saveMood } from "../../store/rest.js";
import { todayKey, weekdayOf, fromDateKey, WEEKDAY_LETTERS, WEEKDAY_NAMES } from "../../utils/dates.js";
import {
  formatHours,
  hoursClock,
  weekSleep,
  sleepSummary,
  QUALITY_LABELS,
  MOOD_LABELS,
  BREATHING_PATTERNS,
} from "../../utils/sleep.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { statRow } from "../../components/stat-row/stat-row.js";
import { levelMark } from "../../components/level/level.js";
import { sleepDial } from "../../components/sleep-dial/sleep-dial.js";
import { barChart } from "../../components/bar-chart/bar-chart.js";
import { segmented } from "../../components/segmented/segmented.js";
import { chipGroup } from "../../components/chip/chip.js";
import { toast } from "../../components/toast/toast.js";
import { openSleepForm } from "./sleep-form.js";
import { openBreathing } from "./breathing.js";

export const title = "Descanso";

const HISTORY_LIMIT = 14;
const MINUTES = [1, 3, 5];
const EMPTY = "–:––"; // reloj apagado: todavía no hay dato

export async function render(root) {
  const today = todayKey();
  let sleeps = [];
  // Lo que se eligió para respirar sobrevive a los repintados
  let breathing = { pattern: "box", minutes: 3 };
  let focusAfterPaint = null;

  async function paint() {
    const [storedSleeps, profile, moods, habits, habitLogs] = await Promise.all([
      get("sleep"), get("profile"), get("mood"), get("habit"), get("habit_log"),
    ]);
    sleeps = storedSleeps ?? [];
    const goal = profile.sleep_goal;
    const lastNight = sleeps.find((s) => s.date === today);
    const summary = sleepSummary(sleeps, today, goal);
    const mood = (moods ?? []).find((m) => m.date === today);
    const pauseHabit = (habits ?? []).find((h) => h.source === "breathing" && !h.archived);
    const pauseDone = pauseHabit && (habitLogs ?? []).some((l) => l.habit_id === pauseHabit.id && l.date === today && l.value >= 1);

    root.innerHTML = `
      <section class="stat-rows content-reveal-stagger" aria-label="Resumen de sueño">
        ${statRow({
          value: lastNight ? hoursClock(lastNight.hours) : EMPTY,
          unit: lastNight ? "h" : "",
          size: "xl",
          copy: lastNight
            ? ["dormidas anoche.", lastNight.hours >= goal ? `Llegaste a tus ${goal} h.` : `Tu meta es ${goal} h.`]
            : ["anoche.", "Registrá cómo dormiste."],
          extra: levelMark(nightLevel(lastNight, goal), "md"),
        })}
        ${statRow({
          value: summary.average === null ? EMPTY : hoursClock(summary.average),
          unit: summary.average === null ? "" : "h",
          copy: summary.nights
            ? ["promedio de la semana.", `${summary.onGoal} de ${summary.nights} ${summary.nights === 1 ? "noche" : "noches"} con ${goal} h.`]
            : ["promedio de la semana.", "Todavía sin noches."],
        })}
      </section>

      <section class="card rest-card content-reveal-position-sm" aria-labelledby="rest-card-title">
        <div class="rest-card__top">
          <h2 class="rest-card__title" id="rest-card-title">${icon("moon")}Anoche</h2>
          <p class="label">${lastNight ? `${lastNight.bed_time} – ${lastNight.wake_time}` : "Sin registro"}</p>
        </div>

        <div class="rest-card__main">
          <div class="rest-dial">
            ${sleepDial({
              bed: lastNight?.bed_time,
              wake: lastNight?.wake_time,
              label: lastNight
                ? `Dormiste de ${lastNight.bed_time} a ${lastNight.wake_time}: ${formatHours(lastNight.hours)}`
                : "Sin registro de anoche",
            })}
            <p class="rest-dial__value" aria-hidden="true">
              <span class="num num--sm">${lastNight ? hoursClock(lastNight.hours) : EMPTY}</span>
              <span class="rest-dial__of">${lastNight ? "dormidas" : "sin registro"}</span>
            </p>
          </div>
          <dl class="rest-readouts">
            <div><dt>Me acosté</dt><dd>${lastNight?.bed_time ?? "—"}</dd></div>
            <div><dt>Me desperté</dt><dd>${lastNight?.wake_time ?? "—"}</dd></div>
            <div><dt>Calidad</dt><dd>${QUALITY_LABELS[lastNight?.quality] ?? "—"}</dd></div>
            <div><dt>Meta</dt><dd>${goal} h</dd></div>
          </dl>
        </div>

        <button class="btn ${lastNight ? "btn--ghost" : "btn--primary"} btn--block" type="button" data-open="sleep" data-focus="sleep-open">
          ${icon(lastNight ? "pencil" : "plus")}${lastNight ? "Editar anoche" : "Registrar sueño"}
        </button>
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="rest-week-title">
        <div class="card__header">
          <h2 class="eyebrow" id="rest-week-title">Esta semana</h2>
          <p class="label">${summary.nights} ${summary.nights === 1 ? "noche registrada" : "noches registradas"}</p>
        </div>
        ${barChart({
          days: weekSleep(sleeps, today).map((night) => ({
            label: WEEKDAY_LETTERS[night.weekday],
            name: `${WEEKDAY_NAMES[night.weekday]} ${night.dayNumber}`,
            value: night.hours ? Math.round(night.hours * 10) / 10 : 0,
            isToday: night.isToday,
            isFuture: night.isFuture,
          })),
          goal,
          unit: "h",
          goalLabel: "Referencia",
        })}
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="rest-breath-title">
        <div class="card__header">
          <h2 class="card__title" id="rest-breath-title">Respiración guiada</h2>
          ${pauseDone ? `<p class="label rest-done">${levelMark("good")}Pausa hecha</p>` : ""}
        </div>
        <p class="card__text">Una pausa de 1 a 5 minutos para bajar el estrés.${pauseHabit ? " Al terminar se marca tu hábito de pausa." : ""}</p>
        <div class="rest-breath" data-breath-options>
          ${segmented({ name: "pattern", legend: "Patrón", value: breathing.pattern, options: BREATHING_PATTERNS })}
          ${chipGroup({
            name: "minutes",
            legend: "Duración",
            type: "radio",
            values: [breathing.minutes],
            options: MINUTES.map((m) => ({ value: m, label: `${m} min` })),
          })}
        </div>
        <button class="btn btn--accent btn--block" type="button" data-breathe data-focus="breathe">
          ${icon("wind")}Empezar
        </button>
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="rest-mood-title">
        <h2 class="card__title" id="rest-mood-title">¿Cómo estás hoy?</h2>
        <p class="card__text">Opcional. Con el tiempo vas a ver si dormir mejor te cambia el día.</p>
        <div class="rest-mood" data-mood>
          ${moodGroup("mood", "Ánimo", mood?.mood)}
          ${moodGroup("energy", "Energía", mood?.energy)}
        </div>
      </section>

      <section class="card card--flush" aria-labelledby="rest-history-title">
        <h2 class="card__title" id="rest-history-title" tabindex="-1">Historial</h2>
        ${history(sleeps, today, goal)}
      </section>
    `;

    const target = focusAfterPaint;
    focusAfterPaint = null;
    if (target) root.querySelector(target)?.focus();
  }

  root.addEventListener("click", async (event) => {
    if (event.target.closest('[data-open="sleep"]')) {
      openSleepForm();
      return;
    }

    if (event.target.closest("[data-breathe]")) {
      openBreathing(breathing);
      return;
    }

    const row = event.target.closest("[data-sleep-date]");
    if (!row) return;
    const night = sleeps.find((s) => s.date === row.dataset.sleepDate);

    if (event.target.closest("[data-edit]")) {
      openSleepForm({ date: night.date });
      return;
    }

    if (event.target.closest("[data-delete]")) {
      if (!confirm(`¿Borrar la noche del ${dayName(night.date, today)}?`)) return;
      focusAfterPaint = "#rest-history-title";
      await remove("sleep", night.id);
      toast("Noche borrada");
    }
  });

  root.addEventListener("change", async (event) => {
    const { name, value } = event.target;
    if (name === "pattern") breathing.pattern = value;
    if (name === "minutes") breathing.minutes = Number(value);
    if (name === "mood" || name === "energy") {
      // el foco vuelve a la opción que se tocó después del repintado
      focusAfterPaint = `[name="${name}"][value="${value}"]`;
      await saveMood(today, { [name]: Number(value) });
    }
  });

  const offs = ["sleep", "profile", "mood", "habit", "habit_log"].map((key) => subscribe(key, paint));

  await paint();
  return () => offs.forEach((off) => off());
}

/* ---------------------------------------- */
/* Piezas */
/* ---------------------------------------- */

// Nivel de una noche contra la meta: llegaste (lleno), cerca (a medias), lejos (aro)
function nightLevel(night, goal) {
  if (!night) return "none";
  if (night.hours >= goal) return "good";
  if (night.hours >= goal - 1) return "mid";
  return "low";
}

function dayName(key, today) {
  if (key === today) return "hoy";
  return `${WEEKDAY_NAMES[weekdayOf(key)]} ${fromDateKey(key).getDate()}`;
}

// Ánimo o energía, de 1 a 5, con la palabra del elegido al lado de la leyenda
function moodGroup(name, legend, value) {
  return chipGroup({
    name,
    legend: value ? `${legend} · ${MOOD_LABELS[value]}` : legend,
    type: "radio",
    values: value ? [value] : [],
    options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n), ariaLabel: `${n}, ${MOOD_LABELS[n].toLowerCase()}` })),
  });
}

function history(sleeps, today, goal) {
  if (!sleeps.length) {
    return `<p class="card__text">Todavía no registraste noches.</p>`;
  }

  const recent = [...sleeps].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, HISTORY_LIMIT);

  return `
    <ul class="list">
      ${recent
        .map((night) => {
          const name = dayName(night.date, today);
          const detail = `${night.bed_time} – ${night.wake_time} · calidad ${(QUALITY_LABELS[night.quality] ?? "sin dato").toLowerCase()}`;
          return `
            <li class="list-row" data-sleep-date="${escapeHTML(night.date)}">
              ${levelMark(nightLevel(night, goal))}
              <span class="list-row__body">
                <span class="list-row__title">${escapeHTML(formatHours(night.hours))} <span class="rest-history__day">· ${escapeHTML(name)}</span></span>
                <span class="list-row__detail">${escapeHTML(detail)}</span>
              </span>
              <span class="list-row__actions">
                <button class="btn btn--icon" type="button" data-edit
                  aria-label="Editar la noche del ${escapeHTML(name)}">${icon("pencil")}</button>
                <button class="btn btn--icon" type="button" data-delete
                  aria-label="Borrar la noche del ${escapeHTML(name)}">${icon("trash-2")}</button>
              </span>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}
