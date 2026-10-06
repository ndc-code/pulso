/* ============================================
   Views — Progreso
   ============================================ */

import { placeholder } from "../../components/placeholder/placeholder.js";

export const title = "Progreso";
export const subtitle = "Salud y evolución";

export function render(root) {
  root.innerHTML = `
    ${placeholder({
      phase: 3,
      title: "Salud y evolución",
      text: "Ver, semana a semana, que los cambios suman.",
      items: [
        "Análisis clínicos con gráfico de evolución por indicador",
        "Peso y cintura, con gráfico",
        "Resumen semanal: hábitos, minutos activos, días verdes y sueño",
        "Calendario de constancia, un día por celda",
      ],
    })}

    <p class="progreso__notice">Pulso no reemplaza el consejo médico.</p>
  `;
}
