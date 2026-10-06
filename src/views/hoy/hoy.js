/* ============================================
   Views — Hoy
   ============================================ */

// Pantalla de inicio: el día de un vistazo (spec 4.1).
//   - tira de la semana: un punto por día según cuánto se cumplió
//   - % del día en grande + un punto por hábito (naranja = cumplido)
//   - lista de hábitos que aplican hoy (Ritmo, Fuerza, Comida, Descanso),
//     con check, contador o + para registrar
//   - peso: el último, cuánto bajó, la meta y su gráfico de evolución
//   - lo que recomienda la ciencia (bloques que se apilan al scrollear,
//     debajo del título de la sección, que queda fijo mientras tanto)
//   - la racha más larga y los accesos rápidos para registrar: van después
//     de la pila para llenar la pantalla cuando el último bloque la cierra
//     (si no, quedaría un hueco grande al final)
//
// Se suscribe a todas las claves que cambian un hábito: si se registra agua
// acá, un entreno en Moverse o se edita un hábito en Ajustes, se refresca sola.

import { get, subscribe } from "../../store/store.js";
import { HABIT_KEYS, loadHabitContext, setManualValue, setWaterGlasses } from "../../store/habits.js";
import { todayKey, WEEKDAY_NAMES } from "../../utils/dates.js";
import { isApplicable, habitTarget, habitValue, habitParts, isDone, strengthToday, dayProgress, weekProgress, sortByOrder } from "../../utils/habits.js";
import { nextSleepHours } from "../../utils/sleep.js";
import { setSleepHours } from "../../store/rest.js";
import { longestStreak } from "../../utils/streaks.js";
import { RECOMMENDATIONS } from "../../content/recommendations.js";
import { dataBlock } from "../../components/data-block/data-block.js";
import { openWorkoutForm } from "../moverse/workout-form.js";
import { openMealForm } from "../comer/meal-form.js";
import { openSleepForm } from "../descanso/sleep-form.js";
import { handleWeightClick } from "./weight-actions.js";
import { openStepsForm } from "./steps-form.js";
import { icon } from "../../utils/icons.js";
import { escapeHTML } from "../../utils/html.js";
import { habitCard, updateHabitCard } from "../../components/habit-card/habit-card.js";
import { weekStrip } from "../../components/week-strip/week-strip.js";
import { weightCard } from "../../components/weight-card/weight-card.js";

export const title = "Pulso";
export const subtitle = "tu día";

export async function render(root) {
  const today = todayKey();
  let ctx = null;
  let body = [];
  let listSignature = "";

  root.innerHTML = `
    <section class="card week content-reveal-position-sm" aria-labelledby="hoy-week-title">
      <h2 class="eyebrow" id="hoy-week-title">Esta semana</h2>
      <div data-week></div>
    </section>

    <section class="card hoy-summary content-reveal-position-sm" aria-labelledby="hoy-summary-title">
      <h2 class="visually-hidden" id="hoy-summary-title">Progreso de hoy</h2>
      <div class="hoy-summary__head">
        <p class="num num--xl hoy-summary__percent" data-percent>0%</p>
        <p class="label hoy-summary__caption">
          <span data-count></span><br />
          <span data-message></span>
        </p>
      </div>
      <ol class="hoy-dots" data-dots aria-hidden="true"></ol>
    </section>

    <section class="card content-reveal-position-sm" aria-labelledby="hoy-habits-title">
      <div class="card__header">
        <h2 class="card__title" id="hoy-habits-title">Tus hábitos</h2>
        <a class="btn btn--text" href="#/perfil/habitos">Editar</a>
      </div>
      <ul class="hoy-habits" data-habits></ul>
    </section>


    <div class="content-reveal-position-sm" data-weight></div>

    <section class="card science" aria-labelledby="hoy-science-title">
      <div class="science__head">
        <h2 class="card__title" id="hoy-science-title">Lo que recomienda la ciencia</h2>
        <p class="card__text">El dato de referencia de cada hábito.</p>
      </div>
      <div class="block-stack">
        ${RECOMMENDATIONS.map((rec, i) =>
          dataBlock({
            tone: ["accent", "strong", "soft"][i % 3],
            label: rec.label,
            value: rec.value,
            unit: rec.unit,
            text: rec.text,
            index: i,
          }),
        ).join("")}
      </div>
    </section>

    <section class="card streak content-reveal-position-sm" data-streak></section>

    <section class="card content-reveal-position-sm" aria-labelledby="hoy-quick-title">
      <h2 class="card__title" id="hoy-quick-title">Registrar</h2>
      <div class="hoy-quick">
        <button class="btn btn--ghost" type="button" data-open="meal">${icon("plus")}Comida</button>
        <button class="btn btn--ghost" type="button" data-open="workout">${icon("plus")}Entreno</button>
        <button class="btn btn--ghost" type="button" data-open="sleep">${icon("plus")}Sueño</button>
        <button class="btn btn--ghost" type="button" data-weight="log">${icon("plus")}Peso</button>
      </div>
    </section>

  `;

  /* ---------------------------------------- */
  /* Pintado */
  /* ---------------------------------------- */

  function stateOf(habit) {
    const state = {
      value: habitValue(habit, today, ctx),
      target: habitTarget(habit, ctx),
      done: isDone(habit, today, ctx),
      parts: habitParts(habit, today, ctx), // solo Comida: agua y comidas
      profile: ctx.profile,
    };
    // Fuerza: el + marca hoy (si todavía no entrenaste) y el − deshace esa marca
    if (habit.source === "strength_week") {
      const { trained, marked } = strengthToday(habit, today, ctx);
      state.canInc = !trained;
      state.canDec = marked;
    }
    return state;
  }

  function renderSummary() {
    const { done, total, percent } = dayProgress(ctx.habits, today, ctx);

    root.querySelector("[data-percent]").textContent = `${percent}%`;
    root.querySelector("[data-count]").textContent = total
      ? `${done} de ${total} hábitos de hoy.`
      : "Sin hábitos para hoy.";

    // Mensajes sin culpa: nunca "fallaste", siempre lo que sigue
    let message = `Te ${total - done === 1 ? "falta 1" : `faltan ${total - done}`}. Vas bien.`;
    if (total === 0) message = "Podés sumar hábitos desde Editar.";
    else if (done === total) message = "Día completo.";
    else if (done === 0) message = "Empezá por el más fácil.";
    root.querySelector("[data-message]").textContent = message;

    // Un punto por hábito: los cumplidos primero, en naranja
    root.querySelector("[data-dots]").innerHTML = Array.from(
      { length: total },
      (_, i) => `<li class="hoy-dots__dot${i < done ? " is-done" : ""}"></li>`,
    ).join("");
  }

  function renderHabits() {
    const list = root.querySelector("[data-habits]");
    const habits = sortByOrder(ctx.habits).filter((habit) => isApplicable(habit, today));

    // Si cambió qué hábitos hay (o cómo se ven) se vuelve a pintar la lista.
    // Si solo cambiaron valores se actualiza en el lugar: así no se pierde
    // el foco del botón que se tocó y los anillos animan la transición.
    const signature = habits
      .map((h) => [h.id, h.name, h.icon, h.color, h.type, h.unit, habitTarget(h, ctx)].join(":"))
      .join("|");

    if (signature !== listSignature) {
      listSignature = signature;
      list.innerHTML = habits.length
        ? habits.map((habit) => habitCard(habit, stateOf(habit))).join("")
        : `<li class="card hoy-empty">
             <p class="card__text">Hoy no tenés hábitos programados.</p>
             <a class="btn btn--accent" href="#/perfil/habitos">Gestionar hábitos</a>
           </li>`;
      return;
    }

    habits.forEach((habit) => {
      const li = list.querySelector(`[data-habit-id="${CSS.escape(habit.id)}"]`);
      updateHabitCard(li, habit, stateOf(habit));
    });
  }

  function renderWeek() {
    const days = weekProgress(ctx.habits, today, ctx);

    root.querySelector("[data-week]").innerHTML = weekStrip(
      days.map((day) => ({
        ...day,
        highlighted: day.isToday,
        label: `${WEEKDAY_NAMES[day.weekday]} ${day.dayNumber}${
          day.isFuture ? "" : day.total ? `: ${day.done} de ${day.total} hábitos` : ": sin hábitos"
        }`,
      })),
    );
  }

  function renderStreak() {
    const best = longestStreak(ctx.habits, today, ctx);
    const days = best?.days ?? 0;

    root.querySelector("[data-streak]").innerHTML = `
      <p class="eyebrow">Racha más larga</p>
      <div class="streak__row">
        <p class="num num--md">${days}</p>
        <p class="label streak__caption">
          ${best
            ? `${days === 1 ? "día" : "días"} seguidos<br />${escapeHTML(best.habit.name)}`
            : "días seguidos<br />Cumplí un hábito y arranca a contar"}
        </p>
      </div>
    `;
  }

  // Tarjeta de peso (la misma que en Fuerza)
  function renderWeight() {
    root.querySelector("[data-weight]").innerHTML = weightCard({ body, goal: ctx.profile.weight_goal, id: "hoy-weight" });
  }

  async function refresh() {
    [ctx, body] = await Promise.all([loadHabitContext(), get("body")]);
    renderWeek();
    renderSummary();
    renderHabits();
    renderStreak();
    renderWeight();
  }

  /* ---------------------------------------- */
  /* Acciones (delegación: un solo listener para toda la lista) */
  /* ---------------------------------------- */

  root.addEventListener("click", async (event) => {
    // Registrar entreno, comida o sueño: hoja sin salir de Hoy
    // (el + de Ritmo, el de comidas en Comida y los accesos de abajo)
    if (event.target.closest('[data-open="steps"]')) {
      openStepsForm({ steps: ctx.stepLogs.find((row) => row.date === today)?.steps ?? 0 });
      return;
    }
    if (event.target.closest('[data-open="workout"]')) {
      openWorkoutForm();
      return;
    }
    if (event.target.closest('[data-open="meal"]')) {
      openMealForm();
      return;
    }
    if (handleWeightClick(event, { body, goal: ctx.profile.weight_goal })) return;
    if (event.target.closest('[data-open="sleep"]')) {
      openSleepForm();
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;

    const li = button.closest("[data-habit-id]");
    const habit = ctx.habits.find((h) => h.id === li.dataset.habitId);
    const { value, target, parts } = stateOf(habit);

    if (button.dataset.action === "toggle") {
      await setManualValue(habit.id, today, value >= 1 ? 0 : 1);
      return;
    }

    // − / +: qué mueven depende del hábito
    const step = button.dataset.action === "inc" ? 1 : -1;
    switch (habit.source) {
      case "food": // el renglón de vasos de Comida
        await setWaterGlasses(today, Math.max(0, parts[0].value + step));
        break;
      case "water":
        await setWaterGlasses(today, Math.max(0, value + step));
        break;
      case "strength_week": // marca (o desmarca) hoy como día de pesas
        await setManualValue(habit.id, today, step > 0 ? 1 : 0);
        break;
      case "sleep": // horas dormidas anoche, de a media hora
        await setSleepHours(today, nextSleepHours(value, step, target));
        break;
      default:
        await setManualValue(habit.id, today, Math.max(0, value + step));
    }
  });

  // Cualquier cambio en los datos de hábitos → refrescar
  // (y el peso, que no es de hábitos)
  const unsubscribers = [...HABIT_KEYS, "body"].map((key) => subscribe(key, refresh));

  await refresh();

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
