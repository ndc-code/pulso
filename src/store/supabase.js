/* ============================================
   Store — Supabase
   ============================================ */

// Crea el cliente de Supabase una sola vez y lo comparte.
//
//   const client = await getClient();   // null = sin conexión con Supabase
//
// supabase-js se carga con import() dinámico desde el CDN: si no hay red o el
// CDN falla, la app arranca igual en modo local (un import estático rompería
// toda la app sin conexión).

import { SUPABASE_URL, SUPABASE_KEY } from "../config.js";
import { authStorage } from "./local.js";

const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm";

let clientPromise = null;

export function getClient() {
  if (!SUPABASE_KEY) return Promise.resolve(null);

  clientPromise ??= import(SUPABASE_JS)
    .then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          flowType: "pkce",          // Google vuelve con ?code= (no con #, que usa el router)
          detectSessionInUrl: true,  // canjea ese ?code= por la sesión al arrancar
          persistSession: true,
          autoRefreshToken: true,
          storage: authStorage,
        },
      }),
    )
    .catch((error) => {
      console.warn("[supabase] no se pudo cargar, la app sigue en modo local", error);
      clientPromise = null; // se reintenta en la próxima llamada
      return null;
    });

  return clientPromise;
}
