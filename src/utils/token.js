/* ============================================
   Utils — Token
   ============================================ */

// Clave personal para el Atajo de pasos.
//
//   const token = newToken();          // "pulso_…" (se muestra una sola vez)
//   const hash = await sha256Hex(token); // lo único que se guarda en Supabase
//
// La Edge Function import-steps calcula el mismo hash para encontrar al dueño.

// `bytes` se puede pasar para los tests; por defecto, 32 bytes al azar
export function newToken(bytes = crypto.getRandomValues(new Uint8Array(32))) {
  const base64 = btoa(String.fromCharCode(...bytes));
  // base64url: sin "+", "/" ni "=" (así se copia y pega sin problemas)
  return "pulso_" + base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function sha256Hex(text) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
