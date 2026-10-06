/* ============================================
   Views — Comer
   ============================================ */

// Alimentación e hidratación (spec 4.3). Calidad, no calorías.
//   número grande + copy chico (comidas de hoy con su nivel)
//   card con anillo, con tabs como en Fuerza para elegir cuál se ve:
//     Comidas: anillo cortado por comida (meta del perfil), − borra la última
//              de hoy, + abre "Registrar comida"
//     Agua:    como "Water" de gauge-ui (anillo cortado por vaso, litros, − / + 250 ml)
//   la semana (un nivel por día) · los chips más frecuentes · historial por día
// (Foto en Fase 5; tips contextuales más adelante.)

import { get, remove, subscribe } from "../../store/store.js";
import { setWaterGlasses } from "../../store/habits.js";
import { todayKey, weekdayOf, fromDateKey, WEEKDAY_LETTERS, WEEKDAY_NAMES } from "../../utils/dates.js";
import { dayScore, weekLevels, topTags, tagLabel, slotLabel, LEVEL_LABELS } from "../../utils/meals.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { statRow } from "../../components/stat-row/stat-row.js";
import { ring } from "../../components/gauge/gauge.js";
import { levelMark } from "../../components/level/level.js";
import { toast } from "../../components/toast/toast.js";
import { tabs, bindTabKeys } from "../../components/tabs/tabs.js";
import { openMealForm } from "./meal-form.js";

const GLASS_ML = 250;

// Nivel del día en corto, para la card de comidas ("Día medio" → "Medio")
const LEVEL_SHORT = { good: "Bueno", mid: "Medio", low: "Flojo", none: "—" };
const liters = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const hour = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// Tabs de la card del anillo (como las de Fuerza)
const TABS = [
  { value: "comidas", label: "Comidas" },
  { value: "agua", label: "Agua" },
];

// Fuera de render: el tab elegido se recuerda al salir y volver a Comida
let currentTab = "comidas";

export const title = "Comida";

export async function render(root) {
  const today = todayKey();
  let meals = [];
  let glasses = 0;
  let lastAt = null;
  let focusHistoryAfterPaint = false;

  async function paint() {
    const [storedMeals, waterLogs, profile] = await Promise.all([get("meal"), get("water_log"), get("profile")]);
    meals = storedMeals ?? [];
    const waterToday = (waterLogs ?? []).find((row) => row.date === today);
    glasses = waterToday?.glasses ?? 0;
    lastAt = waterToday?.last_at ?? null;

    const goal = profile.water_goal;
    const mealGoal = profile.meal_goal ?? 4;
    const todayMeals = meals.filter((m) => m.date === today); // en el orden en que se cargaron
    const lastMeal = todayMeals.at(-1);
    const score = dayScore(meals, today);
    const week = weekLevels(meals, today);
    const counts = { good: 0, mid: 0, low: 0 };
    week.forEach((day) => { if (counts[day.level] !== undefined) counts[day.level]++; });

    // Si el foco estaba en un botón que se repinta (− / + del agua), se recupera después
    const focusKey = document.activeElement?.dataset?.focus;

    // La card del anillo lleva las tabs adentro: solo cambian lo que se ve
    // en la card (Comidas o Agua); el resto de la página es compartido
    const card = currentTab === "agua"
      ? `
        <p class="intake-card__title">${icon("droplet")}${glasses} de ${goal} vasos</p>
        <div class="intake-card__main">
          <div class="intake-card__ring">
            ${ring({ value: glasses, max: goal, size: 152, width: 16, segments: goal <= 16 ? goal : 0, label: `${glasses} de ${goal} vasos` })}
            <p class="intake-card__value" aria-hidden="true">
              <span class="num num--sm">${liters.format((glasses * GLASS_ML) / 1000)} L</span>
              <span class="intake-card__of">de ${liters.format((goal * GLASS_ML) / 1000)} L</span>
            </p>
          </div>
          <dl class="intake-card__readouts">
            <div><dt>Falta</dt><dd>${liters.format((Math.max(0, goal - glasses) * GLASS_ML) / 1000)} L</dd></div>
            <div><dt>Vaso</dt><dd>${GLASS_ML} ml</dd></div>
            <div><dt>Último</dt><dd>${lastAt ? hour.format(new Date(lastAt)) : "—"}</dd></div>
          </dl>
        </div>
        <div class="intake-card__actions">
          <button class="btn btn--icon" type="button" data-water="-1" data-focus="water-dec"
            aria-label="Restar un vaso" ${glasses <= 0 ? "disabled" : ""}>${icon("minus")}</button>
          <button class="btn btn--primary intake-card__add" type="button" data-water="1" data-focus="water-inc">
            ${icon("plus")}${GLASS_ML} ml
          </button>
        </div>
      `
      : `
        <p class="intake-card__title">${icon("apple")}${todayMeals.length} de ${mealGoal} comidas</p>
        <div class="intake-card__main">
          <div class="intake-card__ring">
            ${ring({ value: todayMeals.length, max: mealGoal, size: 152, width: 16, segments: mealGoal <= 16 ? mealGoal : 0, label: `${todayMeals.length} de ${mealGoal} comidas` })}
            <p class="intake-card__value" aria-hidden="true">
              <span class="num num--sm">${todayMeals.length}</span>
              <span class="intake-card__of">de ${mealGoal} comidas</span>
            </p>
          </div>
          <dl class="intake-card__readouts">
            <div><dt>Faltan</dt><dd>${Math.max(0, mealGoal - todayMeals.length)}</dd></div>
            <div><dt>Día</dt><dd>${score.meals ? LEVEL_SHORT[score.level] : "—"}</dd></div>
            <div><dt>Última</dt><dd>${lastMeal ? escapeHTML(slotLabel(lastMeal.slot)) : "—"}</dd></div>
          </dl>
        </div>
        <div class="intake-card__actions">
          <button class="btn btn--icon" type="button" data-meal-undo data-focus="meal-dec"
            aria-label="Borrar la última comida de hoy" ${lastMeal ? "" : "disabled"}>${icon("minus")}</button>
          <button class="btn btn--primary intake-card__add" type="button" data-open="meal" data-focus="meal-inc">
            ${icon("plus")}Registrar comida
          </button>
        </div>
      `;

    root.innerHTML = `
      <section class="stat-rows content-reveal-stagger" aria-label="Resumen de hoy">
        ${statRow({
          value: score.meals,
          size: "xl",
          copy: score.meals
            ? [score.meals === 1 ? "comida hoy." : "comidas hoy.", `${LEVEL_LABELS[score.level]}.`]
            : ["comidas hoy.", "Registrá la primera."],
          extra: levelMark(score.level, "md"),
        })}
      </section>

      <section class="card intake-card content-reveal-position-sm" aria-label="Comidas y agua de hoy">
        ${tabs({ id: "comer", value: currentTab, label: "Comidas o agua", options: TABS })}
        <div class="intake-card__panel" id="comer-panel" role="tabpanel" aria-labelledby="comer-tab-${currentTab}">
          ${card}
        </div>
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="comer-week-title">
        <div class="card__header">
          <h2 class="eyebrow" id="comer-week-title">Esta semana</h2>
          <p class="label">${plural(counts.good, "bueno")} · ${plural(counts.mid, "medio")} · ${plural(counts.low, "flojo")}</p>
        </div>
        <ol class="comer-week">
          ${week.map(weekDay).join("")}
        </ol>
      </section>

      <section class="card content-reveal-position-sm" aria-labelledby="comer-tags-title">
        <h2 class="eyebrow" id="comer-tags-title">Lo más frecuente</h2>
        ${frequentTags(topTags(meals, today))}
      </section>

      <section class="card card--flush" aria-labelledby="comer-history-title">
        <h2 class="card__title" id="comer-history-title" tabindex="-1">Historial</h2>
        ${history(meals, today)}
      </section>
    `;

    if (focusKey) root.querySelector(`[data-focus="${focusKey}"]:not(:disabled)`)?.focus();
    if (focusHistoryAfterPaint) {
      focusHistoryAfterPaint = false;
      root.querySelector("#comer-history-title")?.focus();
    }
  }

  root.addEventListener("click", async (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      currentTab = tab.dataset.tab;
      await paint();
      root.querySelector(`[data-tab="${currentTab}"]`).focus();
      return;
    }

    if (event.target.closest('[data-open="meal"]')) {
      openMealForm();
      return;
    }

    const water = event.target.closest("[data-water]");
    if (water) {
      // el mismo registro que el hábito Agua de Hoy: quedan sincronizados
      await setWaterGlasses(today, Math.max(0, glasses + Number(water.dataset.water)));
      return;
    }

    // − de la card de comidas: borra la última comida cargada hoy
    if (event.target.closest("[data-meal-undo]")) {
      const last = meals.filter((m) => m.date === today).at(-1);
      if (!last || !confirm(`¿Borrar ${slotLabel(last.slot).toLowerCase()} de hoy?`)) return;
      await remove("meal", last.id);
      toast("Comida borrada");
      return;
    }

    const del = event.target.closest("[data-delete]");
    if (!del) return;
    const id = del.closest("[data-meal-id]").dataset.mealId;
    const meal = meals.find((m) => m.id === id);
    if (!confirm(`¿Borrar ${slotLabel(meal.slot).toLowerCase()}?`)) return;
    focusHistoryAfterPaint = true;
    await remove("meal", id);
    toast("Comida borrada");
  });

  bindTabKeys(root);

  const offs = ["meal", "water_log", "profile"].map((key) => subscribe(key, paint));

  await paint();
  return () => offs.forEach((off) => off());
}

/* ---------------------------------------- */
/* Tiles */
/* ---------------------------------------- */

// "1 bueno", "3 buenos"
const plural = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;

function weekDay(day) {
  const classes = ["comer-week__day", day.isToday && "is-today", day.isFuture && "is-future"].filter(Boolean).join(" ");
  const status = day.isFuture ? "todavía no" : LEVEL_LABELS[day.level].toLowerCase();
  return `
    <li class="${classes}">
      ${levelMark(day.isFuture ? "none" : day.level, "md")}
      <span aria-hidden="true">${WEEKDAY_LETTERS[day.weekday]}</span>
      <span class="visually-hidden">${WEEKDAY_NAMES[day.weekday]} ${day.dayNumber}: ${status}</span>
    </li>
  `;
}

function frequentTags({ positives, moderates }) {
  if (!positives.length && !moderates.length) {
    return `<p class="label">Todavía no registraste comidas esta semana.</p>`;
  }

  const pill = ({ tag, count }, moderate) =>
    `<li class="comer-tag${moderate ? " comer-tag--moderate" : ""}">${escapeHTML(tagLabel(tag))} <span>×${count}</span></li>`;

  return `
    <ul class="comer-tags">
      ${positives.slice(0, 4).map((t) => pill(t, false)).join("")}
      ${moderates.slice(0, 3).map((t) => pill(t, true)).join("")}
    </ul>
  `;
}

/* ---------------------------------------- */
/* Historial: por día, del más nuevo al más viejo */
/* ---------------------------------------- */

function history(meals, today) {
  if (!meals.length) {
    return `<p class="card__text">Todavía no registraste comidas.</p>`;
  }

  const days = [...new Set(meals.map((m) => m.date))].sort().reverse();

  return days
    .map((date) => {
      const ofDay = meals.filter((m) => m.date === date);
      const level = dayScore(meals, date).level;
      const name = date === today ? "Hoy" : `${WEEKDAY_NAMES[weekdayOf(date)]} ${fromDateKey(date).getDate()}`;

      return `
        <div class="comer-history__day">
          <p class="eyebrow comer-history__head">
            <span>${name}</span>
            <span class="comer-history__level">${levelMark(level)}${LEVEL_LABELS[level]}</span>
          </p>
          <ul class="list">${ofDay.map(mealRow).join("")}</ul>
        </div>
      `;
    })
    .join("");
}

function mealRow(meal) {
  const tags = meal.tags.map(tagLabel).join(", ");
  const detail = [tags, meal.note].filter(Boolean).join(" · ");

  return `
    <li class="list-row" data-meal-id="${escapeHTML(meal.id)}">
      <span class="list-row__body">
        <span class="list-row__title">${escapeHTML(slotLabel(meal.slot))}</span>
        <span class="list-row__detail">${escapeHTML(detail)}</span>
      </span>
      <span class="list-row__actions">
        <button class="btn btn--icon" type="button" data-delete
          aria-label="Borrar ${escapeHTML(slotLabel(meal.slot).toLowerCase())}">${icon("trash-2")}</button>
      </span>
    </li>
  `;
}
