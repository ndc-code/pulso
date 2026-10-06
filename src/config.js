/* ============================================
   App — Config
   ============================================ */

// Datos públicos del proyecto de Supabase. Se pueden commitear: la
// publishable key está hecha para el navegador y lo que protege los datos
// son las políticas RLS de cada tabla. La service role key NUNCA va acá.
//
// Sin SUPABASE_KEY la app anda igual, solo en este dispositivo (sin login).

export const SUPABASE_URL = "https://drraruoxrvvovnhnammp.supabase.co";

// Supabase › Settings › API Keys → "Publishable key" (sb_publishable_…)
export const SUPABASE_KEY = "sb_publishable_VKL_hKDPV_I67V63g-h-6A__V6rHVJe";

// Edge Function que recibe los pasos del Atajo de iPhone
export const STEPS_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/import-steps`;

// Link de iCloud del Atajo "Pulso pasos" (lo arma el dueño, ver la spec 5.3).
// Vacío = la app muestra la clave pero no el botón para abrir el Atajo.
export const SHORTCUT_URL = "";
