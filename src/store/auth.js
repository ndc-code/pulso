/* ============================================
   Store — Auth
   ============================================ */

// Sesión con Google (Supabase Auth).
//
//   await getSession();              // la sesión actual (o null); la primera vez canjea el ?code=
//   currentUser()?.email             // sin esperar: el usuario de la última sesión conocida
//   const off = onAuthChange((session) => { ... });
//   await signInWithGoogle();        // se va a Google y vuelve a la app
//   await signOut();                 // cierra solo en este dispositivo

import { getClient } from "./supabase.js";

let current = null;
let watching = false;
const listeners = new Set();

export async function getSession() {
  const client = await getClient();
  if (!client) return null;

  const { data } = await client.auth.getSession();
  cleanAuthParams();
  watch(client);
  setCurrent(data.session);
  return current;
}

export function currentUser() {
  return current?.user ?? null;
}

export function onAuthChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function signInWithGoogle() {
  const client = await getClient();
  if (!client) throw new Error("No se pudo conectar con el servidor. Probá de nuevo.");

  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    // Vuelve a la misma página sin el #/ruta (el ?code= no puede ir después de un #)
    options: { redirectTo: location.origin + location.pathname },
  });
  if (error) throw new Error("No se pudo abrir Google. Probá de nuevo.");
}

export async function signOut() {
  const client = await getClient();
  // scope "local": cierra este dispositivo, no todos
  if (client) await client.auth.signOut({ scope: "local" });
  setCurrent(null);
}

// Escucha los cambios de sesión de Supabase (login, logout, token renovado)
function watch(client) {
  if (watching) return;
  watching = true;
  client.auth.onAuthStateChange((_event, session) => setCurrent(session));
}

function setCurrent(session) {
  current = session;
  // setTimeout: supabase-js pide no llamar a Supabase dentro de su propio
  // aviso de cambio de sesión (se puede trabar); así corre después.
  setTimeout(() => listeners.forEach((callback) => callback(session)), 0);
}

// Después de volver de Google la URL queda con ?code=… (o ?error=…): se limpia
// dejando el #/ruta, para que no quede en el historial ni se canjee dos veces.
function cleanAuthParams() {
  const params = new URLSearchParams(location.search);
  if (!params.has("code") && !params.has("error")) return;
  if (params.has("error")) console.warn("[auth]", params.get("error_description") ?? params.get("error"));
  history.replaceState(null, "", location.pathname + location.hash);
}
