/* ============================================
   Store — Steps Token
   ============================================ */

// La clave del Atajo de pasos en Supabase (tabla import_token).
// Solo se guarda el hash: la clave en texto se muestra una vez y listo.
//
//   await hasStepsToken();           // ¿ya conectó Salud alguna vez?
//   const token = await createStepsToken();   // nueva clave (invalida la anterior)

import { getClient } from "./supabase.js";
import { currentUser } from "./auth.js";
import { newToken, sha256Hex } from "../utils/token.js";

export async function hasStepsToken() {
  const client = await getClient();
  if (!client || !currentUser()) return false;

  const { data, error } = await client.from("import_token").select("user_id").maybeSingle();
  if (error) {
    console.warn("[steps-token] no se pudo consultar la clave", error);
    return false;
  }
  return data !== null;
}

export async function createStepsToken() {
  const client = await getClient();
  const user = currentUser();
  if (!client || !user) throw new Error("Entrá con Google para conectar Salud.");

  const token = newToken();
  const { error } = await client
    .from("import_token")
    .upsert(
      { user_id: user.id, token_hash: await sha256Hex(token), created_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw new Error("No se pudo generar la clave. Probá de nuevo.");
  return token;
}
