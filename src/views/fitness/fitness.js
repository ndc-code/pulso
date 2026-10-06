/* ============================================
   Views — Fitness
   ============================================ */

// Fuerza (pesas). Referencia de estructura y UX: openGym (Home, Plan, Stats,
// Exercises), escrito desde cero con el design system de Pulso.
//
// Dos modos:
//   - Tabs: Hoy · Plan · Progreso · Ejercicios (cada tab arma su HTML en su archivo)
//   - Entrenamiento: si hay uno en curso ("entreno_actual" en el store),
//     la página muestra solo eso hasta terminarlo o descartarlo (training.js)
//
// Todas las acciones son botones con data-action; un solo listener las reparte.

import { get, subscribe } from "../../store/store.js";
import { setGoals, startWorkout, toggleRoutineDay, deleteSession } from "../../store/strength.js";
import { todayKey } from "../../utils/dates.js";
import { buildWorkout } from "../../utils/strength.js";
import { EXERCISES } from "../../content/exercises.js";
import { tabs, bindTabKeys } from "../../components/tabs/tabs.js";
import { toast } from "../../components/toast/toast.js";
import * as homeTab from "./home-tab.js";
import * as planTab from "./plan-tab.js";
import * as statsTab from "./stats-tab.js";
import * as exercisesTab from "./exercises-tab.js";
import { mountTraining } from "./training.js";
import { openGoalForm } from "./goal-form.js";
import { openRoutineForm } from "./routine-form.js";
import { openRoutinePicker } from "./routine-picker.js";
import { openExerciseForm } from "./exercise-form.js";
import { openExerciseDetail } from "./exercise-detail.js";
import { handleWeightClick } from "../hoy/weight-actions.js";

export const title = "Fuerza";
export const subtitle = "pesas";

const TABS = [
  { value: "hoy", label: "Hoy", module: homeTab },
  { value: "plan", label: "Plan", module: planTab },
  { value: "progreso", label: "Progreso", module: statsTab },
  { value: "ejercicios", label: "Ejercicios", module: exercisesTab },
];

// Fuera de render: el tab elegido se recuerda al salir y volver a Fuerza
let currentTab = "hoy";

export async function render(root) {
  let state = null;
  let unmountTraining = null;
  let focusAfterPaint = null;

  // Todo lo que necesitan los tabs, en un solo objeto
  async function load() {
    const [objetivos, rutinas, sesiones, custom, workout, body, profile] = await Promise.all([
      get("objetivos"), get("rutina"), get("sesion_fuerza"), get("ejercicio"), get("entreno_actual"),
      get("body"), get("profile"),
    ]);
    state = {
      today: todayKey(),
      goals: objetivos,
      rutinas: rutinas ?? [],
      sesiones: sesiones ?? [],
      // biblioteca: los de base + los propios, ordenados por nombre
      library: [...EXERCISES, ...(custom ?? []).map((e) => ({ ...e, propio: true }))]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      workout,
      // peso, para la tarjeta "Pérdida de peso" (la misma que en Pulso)
      body: body ?? [],
      weightGoal: profile.weight_goal ?? null,
    };
  }

  function paint() {
    unmountTraining?.();
    unmountTraining = null;

    // Entrenamiento en curso: ocupa toda la página
    if (state.workout) {
      unmountTraining = mountTraining(root, state, { onClose: refresh });
      return;
    }

    const tab = TABS.find((t) => t.value === currentTab);
    root.innerHTML = `
      ${tabs({ id: "fuerza", value: currentTab, label: "Secciones de Fuerza", options: TABS })}
      <div class="fuerza-panel" id="fuerza-panel" role="tabpanel" aria-labelledby="fuerza-tab-${currentTab}">
        ${tab.module.html(state)}
      </div>
    `;
    tab.module.mount?.(root, state);

    const target = focusAfterPaint;
    focusAfterPaint = null;
    if (target) root.querySelector(target)?.focus();
  }

  async function refresh() {
    await load();
    paint();
  }

  /* ---------------------------------------- */
  /* Acciones */
  /* ---------------------------------------- */

  const actions = {
    // Hoy
    "edit-goal": () => openGoalForm(state.goals.fuerzaDiasSemana, (dias) => setGoals({ fuerzaDiasSemana: dias })),
    start: async (el) => {
      const rutina = state.rutinas.find((r) => r.id === el.dataset.routineId);
      await startWorkout(buildWorkout(rutina, state.sesiones));
      window.scrollTo(0, 0);
      refresh();
    },
    "start-free": async () => {
      await startWorkout({ rutinaId: null, rutina: "Entrenamiento libre", ejercicios: [] });
      window.scrollTo(0, 0);
      refresh();
    },
    "pick-routine": () =>
      openRoutinePicker({
        title: "Elegir rutina",
        rutinas: state.rutinas,
        onPick: (rutina) => actions.start({ dataset: { routineId: rutina.id } }),
      }),

    // Plan
    "add-to-day": (el) => {
      const day = Number(el.dataset.day);
      openRoutinePicker({
        title: "Agregar rutina",
        rutinas: state.rutinas.filter((r) => !r.dias.includes(day)),
        onPick: (rutina) => toggleRoutineDay(rutina.id, day, true),
        onNew: () => openRoutineForm({ library: state.library, dias: [day] }),
      });
    },
    "remove-from-day": (el) => {
      focusAfterPaint = `[data-action="add-to-day"][data-day="${el.dataset.day}"]`;
      toggleRoutineDay(el.dataset.routineId, Number(el.dataset.day), false);
    },
    "edit-routine": (el) =>
      openRoutineForm({ library: state.library, rutina: state.rutinas.find((r) => r.id === el.dataset.routineId) }),
    "new-routine": () => openRoutineForm({ library: state.library }),

    // Progreso
    "delete-session": async (el) => {
      const sesion = state.sesiones.find((s) => s.id === el.dataset.sessionId);
      if (!confirm(`¿Borrar "${sesion.rutina}" del historial?`)) return;
      focusAfterPaint = "#fuerza-history-title";
      await deleteSession(sesion.id);
      toast("Entrenamiento borrado");
    },

    // Ejercicios
    "new-exercise": () => openExerciseForm(),
    "open-exercise": (el) => {
      const exercise = state.library.find((e) => e.nombre === el.dataset.name);
      openExerciseDetail(exercise, state.sesiones);
    },
  };

  root.addEventListener("click", (event) => {
    if (state.workout) return; // el modo entrenamiento tiene sus propios listeners

    const tab = event.target.closest("[data-tab]");
    if (tab) {
      currentTab = tab.dataset.tab;
      focusAfterPaint = `[data-tab="${currentTab}"]`;
      paint();
      return;
    }

    if (handleWeightClick(event, { body: state.body, goal: state.weightGoal })) return;

    const button = event.target.closest("[data-action]");
    if (button && actions[button.dataset.action]) actions[button.dataset.action](button);
  });

  bindTabKeys(root);

  // El entrenamiento en curso NO se escucha: se guarda en cada cambio de serie
  // y repintar ahí haría perder el foco del campo que se está escribiendo.
  const keys = ["objetivos", "rutina", "sesion_fuerza", "ejercicio", "body", "profile"];
  const offs = keys.map((key) => subscribe(key, refresh));

  await refresh();

  return () => {
    offs.forEach((off) => off());
    unmountTraining?.();
  };
}
