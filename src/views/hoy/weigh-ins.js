/* ============================================
   Views — Weigh-ins
   ============================================ */

// Hoja "Todos los pesajes": cada registro de peso, del más nuevo al más
// viejo, con el cambio contra el anterior y un botón para borrarlo.
//
//   openWeighIns(body)

import { removeBody } from "../../store/health.js";
import { bodySeries } from "../../utils/health.js";
import { fromDateKey } from "../../utils/dates.js";
import { escapeHTML } from "../../utils/html.js";
import { icon } from "../../utils/icons.js";
import { openSheet } from "../../components/sheet/sheet.js";
import { toast } from "../../components/toast/toast.js";

const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const DATE = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

export function openWeighIns(body) {
  // por fecha, viejo → nuevo, para calcular el cambio; después se da vuelta
  const rows = bodySeries(body, "weight").map((point, i, all) => ({
    ...point,
    id: body.find((row) => row.date === point.date)?.id,
    change: i ? Math.round((point.value - all[i - 1].value) * 10) / 10 : null,
  })).reverse();

  const sheet = openSheet({
    title: "Todos los pesajes",
    body: `
      <ul class="list weigh-ins">
        ${rows.map(row).join("")}
      </ul>
    `,
  });

  sheet.element.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-weight]");
    if (!button) return;
    const item = rows.find((r) => r.id === button.dataset.deleteWeight);
    if (!confirm(`¿Borrar el pesaje del ${DATE.format(fromDateKey(item.date))}?`)) return;

    await removeBody(item.id);
    button.closest("li").remove();
    toast("Pesaje borrado");
    if (!sheet.element.querySelector(".weigh-ins li")) sheet.close();
  });
}

function row({ id, date, value, change }) {
  // "↓ 0,4" contra el pesaje anterior (el primero no tiene)
  const delta = change
    ? `<span aria-hidden="true">${change < 0 ? "↓" : "↑"}</span> ${decimal.format(Math.abs(change))} kg`
    : "";
  return `
    <li class="list-row">
      <span class="list-row__body">
        <span class="list-row__title">${decimal.format(value)} kg</span>
        <span class="list-row__detail">${escapeHTML(DATE.format(fromDateKey(date)).replace(/\./g, ""))}${delta ? ` · ${delta}` : ""}</span>
      </span>
      <button class="btn btn--icon" type="button" data-delete-weight="${escapeHTML(id)}"
        aria-label="Borrar el pesaje de ${decimal.format(value)} kg">${icon("trash-2")}</button>
    </li>
  `;
}
