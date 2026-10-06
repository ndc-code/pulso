/* ============================================
   Views — Fitness Training
   ============================================ */

// Modo entrenamiento de Fuerza (como "Workout" de openGym, escrito desde cero):
//   - barra de arriba: descartar · rutina, tiempo y series hechas · Terminar
//   - una tarjeta por ejercicio con su tabla de series (peso × reps) y un check
//     por serie; "Agregar serie"; el último peso usado al lado del nombre
//   - al marcar una serie arranca el timer de descanso (bloque naranja abajo,
//     con −15s / +15s / Saltar)
//
// El estado vive en "entreno_actual" del store y se guarda en cada cambio.
// La vista no se repinta mientras escribís: los cambios de peso y reps se
// guardan en el lugar; solo se repinta al sumar o sacar series y ejercicios.
//
//   const unmount = mountTraining(root, state, { onClose })   // onClose: al terminar o descartar

import { saveWorkout, finishWorkout, discardWorkout } from "../../store/strength.js";
import { lastWeight, newExercise, sessionStats } from "../../utils/strength.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { toast } from "../../components/toast/toast.js";
import { openExercisePicker } from "./exercise-picker.js";
import { dayLabel, formatKg } from "./format.js";
import { exerciseMedia } from "../../components/exercise-media/exercise-media.js";

const REST_STEP = 15;        // segundos que suman o restan los botones del timer
const DONE_MESSAGE_MS = 3000; // cuánto queda el "¡A la próxima serie!" antes de esconderse

export function mountTraining(root, state, { onClose }) {
  const w = state.workout; // se modifica acá y se guarda con saveWorkout(w)
  const controller = new AbortController(); // saca todos los listeners al desmontar
  const { signal } = controller;
  let restAlerted = false;

  /* ---------------------------------------- */
  /* Pintado */
  /* ---------------------------------------- */

  function paint(focusSelector = null) {
    const { done, total } = sessionStats(w);

    root.innerHTML = `
      <section class="training" aria-label="Entrenamiento en curso">
        <div class="training__bar">
          <button class="btn btn--icon" type="button" data-t="discard" aria-label="Descartar entrenamiento">${icon("x")}</button>
          <div class="training__title">
            <p class="training__name">${escapeHTML(w.rutina)}</p>
            <p class="label"><span data-elapsed>${clock(elapsedSeconds())}</span> · <span data-progress-text>${done}/${total} series</span></p>
          </div>
          <button class="btn btn--accent" type="button" data-t="finish">${icon("check")}Terminar</button>
        </div>
        <span class="stat-row__bar" aria-hidden="true"><span data-progress style="width: ${percent(done, total)}%"></span></span>

        ${w.ejercicios.length
          ? w.ejercicios.map(exerciseCard).join("")
          : `<p class="card__text">Entrenamiento libre: agregá el primer ejercicio.</p>`}

        <button class="btn btn--ghost btn--block" type="button" data-t="add-exercise">${icon("plus")}Agregar ejercicio</button>
      </section>

      <div class="rest" data-rest hidden>
        <p class="rest__label" data-rest-label>Descanso</p>
        <p class="num num--md rest__time" data-rest-time role="timer" aria-live="off"></p>
        <div class="rest__actions">
          <button class="btn rest__btn" type="button" data-t="rest" data-delta="${-REST_STEP}" aria-label="Restar ${REST_STEP} segundos">−${REST_STEP}s</button>
          <button class="btn rest__btn" type="button" data-t="rest" data-delta="${REST_STEP}" aria-label="Sumar ${REST_STEP} segundos">+${REST_STEP}s</button>
          <button class="btn rest__btn" type="button" data-t="rest-skip">Saltar</button>
        </div>
      </div>
    `;

    tickRest();
    if (focusSelector) root.querySelector(focusSelector)?.focus();
  }

  function exerciseCard(exercise, i) {
    const last = lastWeight(state.sesiones, exercise.nombre);
    const rows = exercise.series
      .map(
        (s, j) => `
          <div class="sets__row${s.hecha ? " is-done" : ""}" role="row" data-set="${j}">
            <span class="sets__n" role="cell">${j + 1}</span>
            <span role="cell">
              <input class="sets__input" type="number" inputmode="decimal" step="0.5" min="0" value="${s.peso}"
                data-field="peso" aria-label="Peso de la serie ${j + 1}, en kilos" />
            </span>
            <span role="cell">
              <input class="sets__input" type="number" inputmode="numeric" step="1" min="0" value="${s.reps}"
                data-field="reps" aria-label="Repeticiones de la serie ${j + 1}" />
            </span>
            <span role="cell">
              <button class="habit-check sets__check" type="button" data-t="toggle-set" aria-pressed="${s.hecha}"
                aria-label="Serie ${j + 1} hecha">${icon("check")}</button>
            </span>
          </div>
        `,
      )
      .join("");

    return `
      <section class="card training-ex" data-ex="${i}" aria-labelledby="training-ex-${i}">
        <div class="card__header">
          <h2 class="card__title" id="training-ex-${i}" tabindex="-1">${escapeHTML(exercise.nombre)}</h2>
          <span class="fuerza-last" title="Último peso usado">${last ? `${formatKg(last.peso)} kg` : "nuevo"}</span>
        </div>
        <div class="training-ex__intro">
          ${exerciseMedia(exercise.nombre, { size: "md" })}
          <p class="label">${last
            ? `Última vez (${escapeHTML(dayLabel(last.fecha, state.today))}): ${formatKg(last.peso)} kg × ${last.reps}`
            : "Primera vez con este ejercicio"} · descanso ${clock(exercise.descansoSeg)}</p>
        </div>

        <div class="sets" role="table" aria-label="Series de ${escapeHTML(exercise.nombre)}">
          <div class="sets__row sets__head" role="row">
            <span role="columnheader">Serie</span>
            <span role="columnheader">Peso (kg)</span>
            <span role="columnheader">Reps</span>
            <span role="columnheader"><span class="visually-hidden">Hecha</span></span>
          </div>
          ${rows}
        </div>

        <div class="training-ex__actions">
          <button class="btn btn--text" type="button" data-t="add-set">${icon("plus")}Agregar serie</button>
          ${exercise.series.length > 1 ? `<button class="btn btn--text training-ex__remove" type="button" data-t="remove-set">Quitar la última</button>` : ""}
        </div>
      </section>
    `;
  }

  // Después de marcar una serie: contador y barra, sin repintar
  function updateProgress() {
    const { done, total } = sessionStats(w);
    root.querySelector("[data-progress-text]").textContent = `${done}/${total} series`;
    root.querySelector("[data-progress]").style.width = `${percent(done, total)}%`;
  }

  /* ---------------------------------------- */
  /* Timers: tiempo total y descanso */
  /* ---------------------------------------- */

  function elapsedSeconds() {
    return Math.floor((Date.now() - new Date(w.inicio).getTime()) / 1000);
  }

  function tickElapsed() {
    const el = root.querySelector("[data-elapsed]");
    if (el) el.textContent = clock(elapsedSeconds());
  }

  function tickRest() {
    const panel = root.querySelector("[data-rest]");
    if (!panel) return;

    if (!w.descansoHasta) {
      panel.hidden = true;
      return;
    }

    const left = Math.ceil((w.descansoHasta - Date.now()) / 1000);
    panel.hidden = false;

    if (left > 0) {
      restAlerted = false;
      root.querySelector("[data-rest-label]").textContent = "Descanso";
      root.querySelector("[data-rest-time]").textContent = clock(left);
      return;
    }

    // Terminó el descanso: aviso (y vibración en los celus que la tienen)
    root.querySelector("[data-rest-label]").textContent = "¡A la próxima serie!";
    root.querySelector("[data-rest-time]").textContent = "0:00";
    if (!restAlerted) {
      restAlerted = true;
      navigator.vibrate?.([200, 100, 200]);
    }
    if (-left * 1000 > DONE_MESSAGE_MS) {
      w.descansoHasta = null;
      saveWorkout(w);
      panel.hidden = true;
    }
  }

  const elapsedTimer = setInterval(tickElapsed, 1000);
  const restTimer = setInterval(tickRest, 250);

  /* ---------------------------------------- */
  /* Acciones */
  /* ---------------------------------------- */

  // Peso y reps: se guardan mientras escribís, sin repintar
  root.addEventListener(
    "input",
    (event) => {
      const input = event.target.closest("[data-field]");
      if (!input) return;
      const s = setOf(input);
      const value = Number(input.value);
      s[input.dataset.field] = Number.isFinite(value) && value >= 0 ? value : 0;
      saveWorkout(w);
    },
    { signal },
  );

  root.addEventListener(
    "click",
    async (event) => {
      const button = event.target.closest("[data-t]");
      if (!button) return;
      const action = button.dataset.t;

      if (action === "toggle-set") {
        const s = setOf(button);
        const exercise = exerciseOf(button);
        s.hecha = !s.hecha;
        button.setAttribute("aria-pressed", s.hecha);
        button.closest(".sets__row").classList.toggle("is-done", s.hecha);
        // al marcarla arranca el descanso de ese ejercicio
        if (s.hecha) w.descansoHasta = Date.now() + exercise.descansoSeg * 1000;
        saveWorkout(w);
        updateProgress();
        tickRest();
        return;
      }

      if (action === "add-set") {
        const exercise = exerciseOf(button);
        const i = w.ejercicios.indexOf(exercise);
        const last = exercise.series.at(-1) ?? { peso: 0, reps: 10 };
        exercise.series.push({ peso: last.peso, reps: last.reps, hecha: false });
        saveWorkout(w);
        paint(`[data-ex="${i}"] [data-set="${exercise.series.length - 1}"] [data-field="peso"]`);
        return;
      }

      if (action === "remove-set") {
        const exercise = exerciseOf(button);
        const i = w.ejercicios.indexOf(exercise);
        exercise.series.pop();
        saveWorkout(w);
        paint(`[data-ex="${i}"] [data-t="add-set"]`);
        return;
      }

      if (action === "add-exercise") {
        openExercisePicker({
          library: state.library,
          onPick: (picked) => {
            w.ejercicios.push(newExercise({ nombre: picked.nombre }, state.sesiones));
            saveWorkout(w);
            paint(`#training-ex-${w.ejercicios.length - 1}`);
          },
        });
        return;
      }

      if (action === "rest") {
        const delta = Number(button.dataset.delta) * 1000;
        // nunca por debajo de "ahora": restar de más lo termina
        w.descansoHasta = Math.max(Date.now(), w.descansoHasta + delta);
        saveWorkout(w);
        tickRest();
        return;
      }

      if (action === "rest-skip") {
        w.descansoHasta = null;
        saveWorkout(w);
        tickRest();
        return;
      }

      if (action === "discard") {
        if (!confirm("¿Descartar el entrenamiento? No se guarda nada.")) return;
        await discardWorkout();
        toast("Entrenamiento descartado");
        onClose();
        return;
      }

      if (action === "finish") {
        const { done, total } = sessionStats(w);
        if (done === 0) {
          if (!confirm("No marcaste ninguna serie. ¿Descartar el entrenamiento?")) return;
          await discardWorkout();
          onClose();
          return;
        }
        if (done < total && !confirm(`Hiciste ${done} de ${total} series. ¿Terminar igual?`)) return;

        const sesion = await finishWorkout();
        const stats = sessionStats(sesion);
        toast(`Guardado: ${sesion.duracionMin} min · ${stats.done} series · ${formatKg(stats.volume)} kg`);
        onClose();
      }
    },
    { signal },
  );

  // La serie y el ejercicio de un elemento de la tabla
  function exerciseOf(el) {
    return w.ejercicios[Number(el.closest("[data-ex]").dataset.ex)];
  }
  function setOf(el) {
    return exerciseOf(el).series[Number(el.closest("[data-set]").dataset.set)];
  }

  paint();

  return () => {
    controller.abort();
    clearInterval(elapsedTimer);
    clearInterval(restTimer);
  };
}

// 95 → "1:35" · 3725 → "1:02:05"
function clock(seconds) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

const percent = (done, total) => (total ? Math.round((done / total) * 100) : 0);
