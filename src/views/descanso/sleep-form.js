/* ============================================
   Views — Sleep Form
   ============================================ */

// Hoja "Registrar sueño" (spec 4.4): día, hora de dormir y de despertar
// (calcula las horas mientras escribís) y calidad de 1 a 5.
// Se abre desde Descanso y desde Hoy (+ Sueño y el + de Descanso).
// Un registro por día: si el día ya tiene uno, se edita.
//
//   openSleepForm()                         // anoche (el día de hoy)
//   openSleepForm({ date: "2026-10-05" })   // otra noche, para editarla

import { get, remove } from "../../store/store.js";
import { saveSleep } from "../../store/rest.js";
import { sleepHours, formatHours, lastTimes, QUALITY_LABELS } from "../../utils/sleep.js";
import { todayKey } from "../../utils/dates.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { chipGroup } from "../../components/chip/chip.js";
import { field, setFieldError } from "../../components/field/field.js";
import { toast } from "../../components/toast/toast.js";

const MAX_HOURS = 16;

export async function openSleepForm({ date = todayKey() } = {}) {
  const sleeps = (await get("sleep")) ?? [];
  const existing = sleeps.find((s) => s.date === date);
  const times = existing ? { bed: existing.bed_time, wake: existing.wake_time } : lastTimes(sleeps);
  const quality = existing?.quality ?? 3;

  const body = `
    <form class="sleep-form" novalidate>
      <div class="sleep-form__times">
        ${field({ id: "sleep-bed", label: "Me acosté", type: "time", value: times.bed, attrs: { required: true } })}
        ${field({ id: "sleep-wake", label: "Me desperté", type: "time", value: times.wake, attrs: { required: true } })}
      </div>

      <p class="sleep-form__total" aria-live="polite">
        <span class="num num--md" data-total></span>
        <span class="label">dormidas</span>
      </p>

      <div>
        ${chipGroup({
          name: "quality",
          legend: "Calidad",
          type: "radio",
          values: [quality],
          options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n), ariaLabel: `${n}, ${QUALITY_LABELS[n].toLowerCase()}` })),
        })}
        <p class="field__hint">1 muy mala · 5 muy buena</p>
      </div>

      ${field({ id: "sleep-date", label: "Día en que te despertaste", type: "date", value: date, attrs: { max: todayKey(), required: true } })}

      <div class="sheet__actions">
        <button class="btn btn--primary" type="submit">${existing ? "Guardar cambios" : "Guardar sueño"}</button>
      </div>
    </form>
  `;

  const sheet = openSheet({ title: existing ? "Editar sueño" : "Registrar sueño", body });
  const form = sheet.element.querySelector("form");
  const bedInput = form.querySelector("#sleep-bed");
  const wakeInput = form.querySelector("#sleep-wake");
  const totalEl = form.querySelector("[data-total]");

  // Horas en vivo: se recalculan con cada cambio de hora
  const showTotal = () => {
    const hours = sleepHours(bedInput.value, wakeInput.value);
    totalEl.textContent = hours ? formatHours(hours) : "—";
  };
  showTotal();
  form.addEventListener("input", showTotal);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const dateInput = form.querySelector("#sleep-date");
    const newDate = dateInput.value;
    const hours = sleepHours(bedInput.value, wakeInput.value);

    const hoursError = !hours
      ? "Revisá las horas: no pueden ser iguales."
      : hours > MAX_HOURS
        ? `Revisá las horas: da más de ${MAX_HOURS} h.`
        : "";
    setFieldError(wakeInput, hoursError);

    const dateOk = newDate && newDate <= todayKey();
    setFieldError(dateInput, dateOk ? "" : "Elegí un día de hoy para atrás.");

    if (hoursError) {
      wakeInput.focus();
      return;
    }
    if (!dateOk) {
      dateInput.focus();
      return;
    }

    // Si al editar se cambió el día, la noche se mueve (no se duplica)
    if (existing && newDate !== existing.date) await remove("sleep", existing.id);

    await saveSleep({
      date: newDate,
      bed_time: bedInput.value,
      wake_time: wakeInput.value,
      hours,
      quality: Number(form.querySelector('[name="quality"]:checked').value),
    });

    toast(`Sueño guardado: ${formatHours(hours)}`);
    sheet.close();
  });
}
