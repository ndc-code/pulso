/* ============================================
   Content — Steps Guide
   ============================================ */

// Textos de la guía "Conectá tu iPhone" (Perfil › Cuenta › Conexiones).
// El orden importa: es el mismo que usa utils/connect-steps.js.
// Si cambia el Atajo o el camino en la app Atajos, se actualiza acá.

export const STEPS_INTRO =
  "Traé los pasos de tu iPhone a Ritmo sin cargarlos a mano. Se configura una sola vez y después llegan solos.";

export const STEPS_GUIDE = [
  {
    title: "Entrá con Google",
    text: "Arriba, en Cuenta. Así los pasos se guardan en tu cuenta y los ves en todos tus dispositivos.",
  },
  {
    title: "Generá tu clave",
    text: "Es lo que le dice a Pulso que los pasos son tuyos. Se muestra una sola vez: no la compartas.",
  },
  {
    title: "Instalá el Atajo",
    text: "Desde el iPhone, tocá «Copiar clave y abrir el Atajo» y después «Agregar atajo». La app Atajos ya viene en el iPhone.",
  },
  {
    title: "Pegá la clave y permití Salud",
    text: "Cuando el Atajo te pida la clave, pegala. La primera vez que corra, permití que lea tus pasos de Salud.",
  },
  {
    title: "Hacelo automático",
    text: "En Atajos, andá a Automatización › + › Hora del día. Elegí las 23:30 (podés sumar 12:00 y 18:00), marcá «Ejecutar de inmediato» y elegí «Pulso pasos».",
  },
  {
    title: "Probalo",
    text: "Abrí Atajos y tocá «Pulso pasos». Volvé a Pulso: acá vas a ver los pasos que llegaron.",
  },
];
