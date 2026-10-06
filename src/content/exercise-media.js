/* ============================================
   Content — Exercise Media
   ============================================ */

// Foto y animación de cada ejercicio de la biblioteca (content/exercises.js).
//
// Vienen del dataset hasaneyldrm/exercises-dataset (el mismo que usa openGym)
// y se cargan desde su CDN al abrir la app: NO se copian a este repo.
// Son de terceros (© Gym visual, según el dataset) y se usan solo para
// uso personal; si Pulso se publica, hay que revisar este archivo.
//
// La versión del dataset queda fija (un commit), así las URLs no cambian.
// Los ejercicios propios no tienen foto: mediaFor() devuelve null.
//
//   mediaFor("Sentadilla")  → { img: ".../images/0043-qXTaZnJ.jpg", gif: ".../videos/0043-qXTaZnJ.gif" }

const BASE = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd";

export const MEDIA_CREDIT = "© Gym visual";

// Nombre del ejercicio → archivo del dataset (sin extensión).
// El comentario es el nombre en inglés del dataset, para saber qué se eligió.
const FILES = {
  // Pecho
  "Press de banca": "0025-EIeI8Vf", // barbell bench press
  "Press inclinado con mancuernas": "0314-ns0SIbU", // dumbbell incline bench press
  "Press de pecho en máquina": "0577-T0yTjgW", // lever chest press
  "Aperturas con mancuernas": "0308-yz9nUhF", // dumbbell fly
  "Cruce de poleas": "0227-Pr9Rhf4", // cable standing fly
  "Flexiones de brazos": "0662-I4hDWkc", // push-up

  // Espalda
  "Dominadas": "0652-lBDjFxJ", // pull-up
  "Jalón al pecho": "2330-LEprlgG", // cable lat pulldown full range of motion
  "Remo con barra": "0027-eZyBC3j", // barbell bent over row
  "Remo con mancuerna": "0292-C0MA9bC", // dumbbell one arm bent-over row
  "Remo sentado en polea": "0861-fUBheHs", // cable seated row
  "Peso muerto": "0032-ila4NZS", // barbell deadlift

  // Piernas
  "Sentadilla": "0043-qXTaZnJ", // barbell full squat
  "Sentadilla goblet": "0534-ZA8b5hc", // kettlebell goblet squat
  "Prensa de piernas": "0739-10Z2DXU", // sled 45° leg press
  "Peso muerto rumano": "0085-wQ2c4XD", // barbell romanian deadlift
  "Estocadas": "0336-RRWFUcw", // dumbbell lunge
  "Sentadilla búlgara": "0410-qx4fgX7", // dumbbell single leg split squat
  "Extensión de cuádriceps": "0585-my33uHU", // lever leg extension
  "Curl femoral": "0586-17lJ1kr", // lever lying leg curl
  "Hip thrust": "1409-qKBpF7I", // barbell glute bridge
  "Elevación de talones": "0605-ykUOVze", // lever standing calf raise

  // Hombros
  "Press militar": "1456-wdRZISl", // barbell standing close grip military press
  "Press de hombros con mancuernas": "0405-znQUdHY", // dumbbell seated shoulder press
  "Elevaciones laterales": "0334-DsgkuIt", // dumbbell lateral raise
  "Face pull": "0203-wqNPGCg", // cable rear delt row (with rope)
  "Pájaros": "0378-8DiFDVA", // dumbbell rear fly

  // Brazos
  "Curl de bíceps con barra": "0031-25GPyDY", // barbell curl
  "Curl martillo": "0313-slDvUAU", // dumbbell hammer curl
  "Extensión de tríceps en polea": "0201-3ZflifB", // cable pushdown
  "Fondos en paralelas": "0251-9WTm7dq", // chest dip
  "Press francés": "0060-h8LFzo9", // barbell lying triceps extension skull crusher

  // Core
  "Plancha": "2135-VBAWRPG", // weighted front plank
  "Plancha lateral": "0705-RKjH6Lt", // side bridge v. 2
  "Dead bug": "0276-iny3m5y", // dead bug
  "Pallof press": "0979-9pa4H5m", // band horizontal pallof press
  "Paseo del granjero": "2133-qPEzJjA", // farmers walk
};

export function mediaFor(nombre) {
  const file = FILES[nombre];
  if (!file) return null;
  return { img: `${BASE}/images/${file}.jpg`, gif: `${BASE}/videos/${file}.gif` };
}
