/* ============================================
   Store — Account
   ============================================ */

// La cuenta de punta a punta: arrancar la sincronización cuando hay sesión,
// entrar con Google y cerrar sesión (con sus avisos).
//
//   initAccount();    // en main.js, una vez
//   await login();    // botón "Entrar con Google"
//   await logout();   // botón "Cerrar sesión"

import { getSession, onAuthChange, signInWithGoogle, signOut } from "./auth.js";
import * as sync from "./sync.js";
import { exportData } from "./backup.js";
import { downloadJSON } from "../utils/download.js";
import { todayKey } from "../utils/dates.js";
import { toast } from "../components/toast/toast.js";

let starting = null;

export async function initAccount() {
  onAuthChange((session) => {
    if (session && !sync.isActive()) startSync(session);
    if (!session && sync.isActive()) sync.stop();
  });
  // Avisa la sesión actual (si volvés de Google, canjea el ?code= primero)
  await getSession();
}

export const login = signInWithGoogle;

export async function logout() {
  // Sin red, signOut puede fallar y la sesión seguiría con los datos ya borrados
  if (!navigator.onLine) {
    toast("Necesitás conexión para cerrar sesión.");
    return;
  }
  await sync.push();
  const { pending } = await sync.getStatus();
  if (pending > 0 && !confirm("Hay cambios que todavía no se subieron. Si cerrás sesión se pierden. ¿Cerrar igual?")) {
    return;
  }
  await signOut();
  await sync.clearLocalData();
  // Arranca de cero, como la primera vez (seed.js vuelve a sembrar)
  location.reload();
}

function startSync(session) {
  starting ??= sync
    .start(session, { confirmReplace })
    .then(async (result) => {
      if (result === "cancelled") await signOut();
      if (result === "error") toast("No se pudo conectar con tu cuenta. Se reintenta la próxima vez que abras la app.");
    })
    .finally(() => {
      starting = null;
    });
  return starting;
}

// Primer login en un dispositivo con datos propios, en una cuenta que ya tiene
// datos: se reemplazan por los de la cuenta, con una copia descargada antes.
async function confirmReplace() {
  const ok = confirm(
    "Este dispositivo tiene datos que no están en tu cuenta. Se van a reemplazar por los de tu cuenta; antes se descarga una copia de este dispositivo por las dudas. ¿Seguimos?",
  );
  if (ok) downloadJSON(await exportData(), `pulso-backup-${todayKey()}.json`);
  return ok;
}
