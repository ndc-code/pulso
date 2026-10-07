/* ============================================
   Functions — Import Steps
   ============================================ */

// Recibe los pasos del día desde el Atajo de iPhone y los guarda en steps_log.
//
//   POST /functions/v1/import-steps
//   header  x-pulso-key: pulso_…          (la clave que da Pulso en Perfil)
//   body    { "date": "2026-10-06", "steps": 8123 }
//
// Guarda el TOTAL del día (no suma): si el Atajo corre varias veces, queda el último.
// Usa la service role key (variable de entorno de Supabase) para escribir en
// nombre del dueño de la clave; nunca está en el repo.

import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { validateStepsPayload } from "./validate.js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, { error: "Usá POST." });

  const key = req.headers.get("x-pulso-key") ?? "";
  if (!key) return reply(401, { error: "Falta la clave." });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "El cuerpo tiene que ser JSON." });
  }

  const result = validateStepsPayload(body);
  if (!result.ok) return reply(400, { error: result.error });
  const { date, steps } = result;

  // ¿De quién es la clave?
  const { data: owner, error: ownerError } = await supabase
    .from("import_token")
    .select("user_id")
    .eq("token_hash", await sha256Hex(key))
    .maybeSingle();
  if (ownerError) return reply(500, { error: "No se pudo verificar la clave." });
  if (!owner) return reply(401, { error: "La clave no es válida. Generá una nueva en Pulso." });

  // ¿Ya hay pasos de ese día?
  const { data: existing, error: findError } = await supabase
    .from("steps_log")
    .select("id, data")
    .eq("user_id", owner.user_id)
    .eq("date", date)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) return reply(500, { error: "No se pudieron leer los pasos." });

  let saveError;
  if (existing) {
    ({ error: saveError } = await supabase
      .from("steps_log")
      .update({ data: { ...existing.data, steps } })
      .eq("user_id", owner.user_id)
      .eq("id", existing.id));
  } else {
    const id = crypto.randomUUID();
    ({ error: saveError } = await supabase
      .from("steps_log")
      .insert({ id, user_id: owner.user_id, date, data: { id, date, steps } }));
  }
  if (saveError) return reply(500, { error: "No se pudieron guardar los pasos." });

  return reply(200, { ok: true, date, steps });
});

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// El mismo hash que src/utils/token.js (SHA-256 en hex)
async function sha256Hex(text: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
