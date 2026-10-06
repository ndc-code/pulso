/* ============================================
   Content — Recommendations
   ============================================ */

// Lo que recomienda la ciencia para cada hábito (cards de Hoy).
// `reference` no se muestra en la app: queda acá para saber de dónde sale
// cada dato. Si se edita un valor, actualizar también la referencia.


export const RECOMMENDATIONS = [
  {
    id: "move",
    source: null,
    label: "Actividad física",
    value: "150",
    unit: "min por semana",
    text: "Actividad moderada como mínimo. Hasta 300 minutos suma más beneficios.",
    reference: "OMS, 2020",
  },
  {
    id: "sleep",
    source: "sleep",
    label: "Sueño",
    value: "7",
    unit: "h o más",
    text: "Por noche, para adultos.",
    reference: "AASM y SRS, 2015",
  },
  {
    id: "veggies",
    source: "meal_veggies",
    label: "Frutas y verduras",
    value: "400",
    unit: "g por día",
    text: "Como mínimo, unas 5 porciones al día.",
    reference: "OMS",
  },
  {
    id: "water",
    source: "water",
    label: "Agua",
    value: "2–2,5",
    unit: "L por día",
    text: "De agua total, contando la de los alimentos. 2 L mujeres, 2,5 L hombres.",
    reference: "EFSA, 2010",
  },
  {
    id: "sugar",
    source: null,
    label: "Azúcares libres",
    value: "<10",
    unit: "%",
    text: "De las calorías del día como azúcares libres; mejor menos del 5%. Los ultraprocesados son su fuente principal.",
    reference: "OMS, 2015",
  },
  {
    id: "breath",
    source: "breathing",
    label: "Respiración lenta",
    value: "<10",
    unit: "resp. por minuto",
    text: "Respirar lento se asocia a más calma y menos ansiedad.",
    reference: "Zaccaro y otros, 2018",
  },
];
