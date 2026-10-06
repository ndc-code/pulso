/* ============================================
   Views — Perfil
   ============================================ */

// Perfil y ajustes (spec 4.6): nombre, objetivo, metas, hábitos, tema y datos.
// Todo se guarda apenas cambia; no hay botón "Guardar".

import { get, set, subscribe } from "../../store/store.js";
import { exportData, importData } from "../../store/backup.js";
import { todayKey } from "../../utils/dates.js";
import { icon } from "../../utils/icons.js";
import { field, setFieldError } from "../../components/field/field.js";
import { segmented } from "../../components/segmented/segmented.js";
import { chipGroup } from "../../components/chip/chip.js";
import { toast } from "../../components/toast/toast.js";
import { mountAccountCard } from "./account-card.js";

export const title = "Perfil";
export const subtitle = "Ajustes y metas";

const GOAL_OPTIONS = [
  { value: "move", label: "Moverme más" },
  { value: "eat", label: "Comer mejor" },
  { value: "sleep", label: "Dormir mejor" },
  { value: "all", label: "Todo" },
];

const THEME_OPTIONS = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

// Metas numéricas: campo del perfil, rango válido y texto
const GOALS = [
  { key: "weekly_active_goal", label: "Minutos activos por semana", suffix: "min", min: 10, max: 1000, hint: "La OMS recomienda 150." },
  { key: "water_goal", label: "Agua por día", suffix: "vasos", min: 1, max: 20 },
  { key: "meal_goal", label: "Comidas por día", suffix: "comidas", min: 1, max: 8 },
  { key: "sleep_goal", label: "Sueño por noche", suffix: "horas", min: 4, max: 12 },
];

export async function render(root) {
  const profile = await get("profile");
  const habits = (await get("habit")) ?? [];

  root.innerHTML = `
    <section class="card content-reveal-position-sm" data-account></section>

    <section class="card content-reveal-position-sm">
      <h2 class="card__title">Vos</h2>
      ${field({ id: "perfil-name", label: "Nombre", value: profile.name, placeholder: "¿Cómo te llamás?", autocomplete: "given-name" })}
      ${chipGroup({ name: "goal", legend: "Objetivo principal", type: "radio", values: profile.goal ? [profile.goal] : [], options: GOAL_OPTIONS })}
    </section>

    <section class="card content-reveal-position-sm">
      <h2 class="card__title">Metas</h2>
      ${GOALS.map((goal) =>
        field({
          id: `goal-${goal.key}`,
          label: goal.label,
          type: "number",
          value: profile[goal.key],
          suffix: goal.suffix,
          hint: goal.hint,
          attrs: { min: goal.min, max: goal.max, step: 1, "data-goal": goal.key },
        }),
      ).join("")}
    </section>

    <section class="card content-reveal-position-sm">
      <h2 class="card__title">Hábitos</h2>
      <a class="list-row" href="#/perfil/habitos">
        <span class="list-row__icon">${icon("check")}</span>
        <span class="list-row__body">
          <span class="list-row__title">Gestionar hábitos</span>
          <span class="list-row__detail" data-habit-count>${activeCount(habits)}</span>
        </span>
        ${icon("chevron-left", "list-row__chevron")}
      </a>
    </section>

    <section class="card content-reveal-position-sm">
      <h2 class="card__title">Apariencia</h2>
      ${segmented({ name: "theme", legend: "Tema", value: profile.theme, options: THEME_OPTIONS })}
    </section>

    <section class="card content-reveal-position-sm">
      <h2 class="card__title">Tus datos</h2>
      <p class="card__text">Viven solo en este dispositivo. Exportalos de vez en cuando para tener una copia.</p>
      <div class="perfil__data-actions">
        <button class="btn btn--ghost" type="button" data-export>${icon("download")}Exportar</button>
        <label class="btn btn--ghost">
          ${icon("upload")}Importar
          <input class="visually-hidden" type="file" accept="application/json,.json" data-import />
        </label>
      </div>
    </section>
  `;

  /* --- Nombre: se guarda mientras escribís (el saludo se actualiza en vivo) --- */
  root.querySelector("#perfil-name").addEventListener("input", (event) => {
    updateProfile({ name: event.target.value });
  });

  /* --- Objetivo, tema: cambios de radios --- */
  root.addEventListener("change", (event) => {
    const { name, value } = event.target;
    if (name === "goal") updateProfile({ goal: value });
    if (name === "theme") updateProfile({ theme: value });
  });

  /* --- Metas: se validan y se guardan al salir del campo --- */
  root.querySelectorAll("[data-goal]").forEach((input) => {
    input.addEventListener("change", () => {
      const goal = GOALS.find((g) => g.key === input.dataset.goal);
      const value = Number(input.value);

      if (!Number.isInteger(value) || value < goal.min || value > goal.max) {
        setFieldError(input, `Tiene que ser un número entre ${goal.min} y ${goal.max}.`);
        return;
      }
      setFieldError(input, "");
      updateProfile({ [goal.key]: value });
      toast("Meta guardada");
    });
  });

  /* --- Exportar: descarga un .json --- */
  root.querySelector("[data-export]").addEventListener("click", async () => {
    const backup = await exportData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pulso-backup-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  /* --- Importar: lee el archivo, confirma y reemplaza --- */
  root.querySelector("[data-import]").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text());
      if (!confirm("Esto reemplaza todos tus datos actuales por los del archivo. ¿Seguimos?")) return;
      await importData(backup);
      toast("Datos importados");
      // repinta la vista para que los campos muestren los datos nuevos
      window.dispatchEvent(new Event("pulso:refresh"));
    } catch (error) {
      toast(error instanceof SyntaxError ? "El archivo no es un JSON válido." : error.message);
    }
  });

  const offAccount = mountAccountCard(root.querySelector("[data-account]"));

  // Si se importan datos o cambian los hábitos, actualizar el contador
  const off = subscribe("habit", (value) => {
    root.querySelector("[data-habit-count]").textContent = activeCount(value ?? []);
  });

  return () => {
    off();
    offAccount();
  };
}

function activeCount(habits) {
  const count = habits.filter((h) => !h.archived).length;
  return count === 1 ? "1 activo" : `${count} activos`;
}

// Lee el perfil actual y pisa solo los campos que cambian
async function updateProfile(changes) {
  const current = await get("profile");
  await set("profile", { ...current, ...changes });
}
