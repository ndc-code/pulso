/* ============================================
   Store — Local
   ============================================ */

// Adaptador de datos sobre localStorage.
//
// Es el ÚNICO archivo de la app que toca localStorage.
// store.js no lo usa directo: pasa por synced.js, que guarda acá y además
// anota los cambios para subirlos a Supabase (ver sync.js).
//
// Las funciones son async aunque localStorage sea sincrónico:
// así la firma ya es la misma que tendrá el adaptador de Supabase.

const PREFIX = "pulso:";

// Memoria de respaldo si localStorage no está disponible
// (modo privado estricto, cookies bloqueadas). La app sigue andando,
// solo que los datos no sobreviven a una recarga.
const memory = new Map();

function storage() {
  try {
    const test = PREFIX + "__test";
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return localStorage;
  } catch {
    return null;
  }
}

const ls = storage();

export async function read(key) {
  const raw = ls ? ls.getItem(PREFIX + key) : memory.get(key);
  if (raw == null) return null;

  try {
    return JSON.parse(raw);
  } catch {
    // Dato corrupto: mejor devolver vacío que romper la vista
    console.warn(`[store] valor inválido en "${key}", se ignora`);
    return null;
  }
}

export async function write(key, value) {
  const raw = JSON.stringify(value);
  if (ls) ls.setItem(PREFIX + key, raw);
  else memory.set(key, raw);
}

export async function remove(key) {
  if (ls) ls.removeItem(PREFIX + key);
  else memory.delete(key);
}

// Dónde guarda supabase-js la sesión (se lo pasa supabase.js como auth.storage).
// supabase-js maneja texto plano, así que acá no se hace JSON.parse.
// Vive en este archivo para que siga siendo el único que toca localStorage.
export const authStorage = {
  getItem: (key) => (ls ? ls.getItem(PREFIX + key) : memory.get(key) ?? null),
  setItem: (key, value) => {
    if (ls) ls.setItem(PREFIX + key, value);
    else memory.set(key, value);
  },
  removeItem: (key) => {
    if (ls) ls.removeItem(PREFIX + key);
    else memory.delete(key);
  },
};
