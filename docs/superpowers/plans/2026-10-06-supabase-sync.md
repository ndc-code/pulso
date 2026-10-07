# Supabase: sincronización, login con Google y pasos desde Salud — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guardar los datos de Pulso en Supabase por usuario, entrar con Google, sincronizar todos los dispositivos y recibir los pasos del día desde un Atajo de iPhone.

**Architecture:** Local primero. localStorage (`local.js`) sigue siendo lo que leen las vistas. Un adaptador nuevo, `synced.js`, envuelve a `local.js`: en cada `write` calcula qué filas cambiaron y las anota en una cola, que `sync.js` sube a Supabase. Al abrir la app o volver a ella, `sync.js` baja lo que cambió en cada tabla desde la última vez. Cada colección es una tabla `(id, user_id, date, data jsonb, updated_at, deleted_at)` con RLS. Los pasos entran por una Edge Function que valida una clave personal.

**Tech Stack:** HTML/CSS/JS vanilla (ES modules, sin build), `@supabase/supabase-js@2.117.2` por CDN (jsdelivr `+esm`), Supabase (Postgres + Auth con Google + Edge Functions en Deno), `node:test` para la lógica pura.

**Spec:** `docs/superpowers/specs/2026-10-06-supabase-sync-design.md` (leerla antes de empezar).

## Global Constraints

- Proyecto Supabase: ref `drraruoxrvvovnhnammp`, URL `https://drraruoxrvvovnhnammp.supabase.co`. App publicada: `https://ndc-code.github.io/pulso/`. Local: `http://localhost:4173` (preview `static-server` en `.claude/launch.json`).
- Leer `CLAUDE.md` y `DESIGN.md` antes de tocar UI. Copy en español (es-AR), comentarios en español donde ayuden, código claro y sin sobre-ingeniería: el dueño quiere entender todo.
- Cada archivo CSS/JS nuevo empieza con el banner de 3 líneas `/* ============================================\n   <Grupo> — <Nombre>\n   ============================================ */`. Grupos: `Store`, `Utils`, `Views`, `App`, `Tests`.
- **Solo `src/store/local.js` toca localStorage.** Las vistas y componentes solo hablan con `src/store/`.
- Todo valor del usuario que entra en un template pasa por `escapeHTML()` (`src/utils/html.js`).
- Toda lógica que decide algo es una función pura en `src/utils/` con su test en `tests/`, **escrito primero**. Tests: `node --test 'tests/**/*.test.js'` (siempre con el glob).
- CSS: solo alias semánticos (`--color-text`, `--card-gap`…), tamaños con tokens o `px`, mobile first, sin `max-width`.
- Fechas: claves locales `"YYYY-MM-DD"` (`utils/dates.js`), nunca `toISOString()` para el día. (Las marcas de tiempo de sincronización sí son ISO UTC.)
- En el repo solo van la URL y la **publishable** key. La service role key nunca se escribe en ningún archivo.
- Antes de tocar Supabase (SQL, RLS, funciones), cargar los skills `supabase:supabase` y `supabase:supabase-postgres-best-practices`.
- No hacer `push` ni abrir PR sin que el dueño lo pida. Commits en la rama `supabase-sync`, terminando con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Lo que hace el dueño (bloqueantes)

| Antes de | Qué |
|---|---|
| Task 1, paso 3 | Autorizar el conector de Supabase para Claude (`/mcp` en una terminal con `claude`), **o** pegar el SQL en Supabase › SQL Editor. |
| Task 1, paso 4 | Pasar la publishable key (Supabase › Settings › API Keys, empieza con `sb_publishable_`). |
| Task 2, paso 8 | Google Cloud Console: cliente OAuth tipo Web con redirect `https://drraruoxrvvovnhnammp.supabase.co/auth/v1/callback` → Client ID y Secret en Supabase › Authentication › Providers › Google. Supabase › Authentication › URL Configuration: Site URL `https://ndc-code.github.io/pulso/`, Redirect URLs `https://ndc-code.github.io/pulso/` y `http://localhost:4173/`. |
| Task 2, paso 8 | Tocar "Entrar con Google" y elegir la cuenta (Claude no ingresa credenciales). |
| Task 8, paso 6 | Armar el Atajo en el iPhone (spec 5.3), compartirlo por iCloud y pasar el link. |

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `supabase/migrations/20261006120000_sync_tables.sql` | Tablas, índices, RLS, triggers, `user_doc`, `import_token` |
| `src/config.js` | URL, publishable key, URL de la función, link del Atajo |
| `src/store/local.js` | + `authStorage` (sesión de Supabase) |
| `src/store/supabase.js` | Cliente de supabase-js, cargado con `import()` dinámico |
| `src/store/auth.js` | Sesión, entrar con Google, salir, avisos |
| `src/utils/sync.js` | Lógica pura de la sincronización |
| `src/store/sync.js` | Cola, subir, bajar, primer login, estado |
| `src/store/synced.js` | Adaptador `read/write/remove` = local + cola |
| `src/store/account.js` | Orquesta: arranque, login, logout, `confirm()` |
| `src/utils/download.js` | Descargar un JSON |
| `src/utils/token.js` | Clave del Atajo + SHA-256 |
| `src/store/steps-token.js` | Generar/consultar la clave en `import_token` |
| `supabase/functions/import-steps/validate.js` | Validación pura del payload |
| `supabase/functions/import-steps/index.ts` | Edge Function |
| `src/views/perfil/account-card.js` | Bloque "Cuenta" |
| `src/views/perfil/health-card.js` | Bloque "Pasos desde Salud" |
| `tests/sync.test.js`, `tests/token.test.js`, `tests/import-steps.test.js` | Tests |

---

### Task 1: Base de datos y configuración

**Files:**
- Create: `supabase/migrations/20261006120000_sync_tables.sql`
- Create: `src/config.js`

**Interfaces:**
- Produces: tablas `habit, habit_log, water_log, steps_log, workout, meal, sleep, mood, lab_result, body, rutina, sesion_fuerza, ejercicio` con columnas `id text, user_id uuid, date date, data jsonb, updated_at timestamptz, deleted_at timestamptz`, PK `(user_id, id)`; `user_doc(user_id, key, value jsonb, updated_at)`, PK `(user_id, key)`; `import_token(user_id PK, token_hash unique, created_at)`.
- Produces: `src/config.js` → `SUPABASE_URL: string`, `SUPABASE_KEY: string`, `STEPS_FUNCTION_URL: string`, `SHORTCUT_URL: string`.

- [ ] **Step 1: Escribir la migración**

`supabase/migrations/20261006120000_sync_tables.sql`:

```sql
-- ============================================
-- Pulso — tablas de sincronización
-- ============================================
-- Una tabla por colección del store, todas con la misma forma:
-- columnas fijas para sincronizar + `data` con la fila tal cual la guarda la app.
-- Ver docs/superpowers/specs/2026-10-06-supabase-sync-design.md (sección 3).

-- updated_at lo pone el servidor en cada insert/update (no el reloj del dispositivo)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Colecciones
do $$
declare
  t text;
begin
  foreach t in array array[
    'habit', 'habit_log', 'water_log', 'steps_log', 'workout', 'meal', 'sleep',
    'mood', 'lab_result', 'body', 'rutina', 'sesion_fuerza', 'ejercicio'
  ] loop
    execute format($sql$
      create table public.%1$I (
        id          text        not null,
        user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
        date        date,
        data        jsonb       not null,
        updated_at  timestamptz not null default now(),
        deleted_at  timestamptz,
        primary key (user_id, id)
      );

      create index %2$I on public.%1$I (user_id, updated_at);

      create trigger set_updated_at
        before insert or update on public.%1$I
        for each row execute function public.set_updated_at();

      alter table public.%1$I enable row level security;

      create policy "Ver lo propio" on public.%1$I
        for select to authenticated
        using ((select auth.uid()) = user_id);

      create policy "Crear lo propio" on public.%1$I
        for insert to authenticated
        with check ((select auth.uid()) = user_id);

      create policy "Editar lo propio" on public.%1$I
        for update to authenticated
        using ((select auth.uid()) = user_id)
        with check ((select auth.uid()) = user_id);

      grant select, insert, update on public.%1$I to authenticated;
    $sql$, t, t || '_user_updated_idx');
  end loop;
end;
$$;

-- Objetos únicos por usuario: profile, objetivos, lab_range, entreno_actual
create table public.user_doc (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key         text        not null,
  value       jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

create index user_doc_user_updated_idx on public.user_doc (user_id, updated_at);

create trigger set_updated_at
  before insert or update on public.user_doc
  for each row execute function public.set_updated_at();

alter table public.user_doc enable row level security;

create policy "Ver lo propio" on public.user_doc
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear lo propio" on public.user_doc
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar lo propio" on public.user_doc
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_doc to authenticated;

-- Clave del Atajo de pasos: solo el hash (SHA-256 en hex), una por usuario
create table public.import_token (
  user_id     uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash  text        not null unique,
  created_at  timestamptz not null default now()
);

alter table public.import_token enable row level security;

create policy "Ver lo propio" on public.import_token
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear lo propio" on public.import_token
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar lo propio" on public.import_token
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.import_token to authenticated;
```

- [ ] **Step 2: Escribir `src/config.js`**

```js
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
export const SUPABASE_KEY = "";

// Edge Function que recibe los pasos del Atajo de iPhone
export const STEPS_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/import-steps`;

// Link de iCloud del Atajo "Pulso pasos" (lo arma el dueño, ver la spec 5.3).
// Vacío = la app muestra la clave pero no el botón para abrir el Atajo.
export const SHORTCUT_URL = "";
```

- [ ] **Step 3: Aplicar la migración**

Si el conector de Supabase está autorizado: `apply_migration` con `name: "sync_tables"` y el contenido del archivo. Si no: pedirle al dueño que lo pegue en Supabase › SQL Editor y lo ejecute.

Verificar con `execute_sql` (o pidiendo al dueño que lo corra):

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Esperado: 15 filas (`body, ejercicio, habit, habit_log, import_token, lab_result, meal, mood, rutina, sesion_fuerza, sleep, steps_log, user_doc, water_log, workout`), todas con `rowsecurity = true`. Después correr `get_advisors` (tipo `security`) y confirmar que no hay avisos sobre estas tablas.

- [ ] **Step 4: Completar la publishable key**

Pegar en `SUPABASE_KEY` la key que pase el dueño. Verificar desde la terminal que la API responde y que RLS bloquea a un anónimo:

```bash
curl -s "https://drraruoxrvvovnhnammp.supabase.co/rest/v1/habit?select=id" -H "apikey: <SUPABASE_KEY>"
```

Esperado: `[]` (sin sesión, RLS no deja ver nada).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261006120000_sync_tables.sql src/config.js
git commit -m "Supabase: tablas con RLS y configuración del proyecto"
```

---

### Task 2: Cliente de Supabase y login con Google

**Files:**
- Modify: `src/store/local.js` (agregar `authStorage` al final)
- Create: `src/store/supabase.js`
- Create: `src/store/auth.js`
- Create: `src/views/perfil/account-card.js` (versión solo login, el estado de sincronización llega en la Task 5)
- Modify: `src/views/perfil/perfil.js` (montar el bloque)

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_KEY` de `src/config.js`.
- Produces: `local.authStorage: { getItem(key): string|null, setItem(key, value): void, removeItem(key): void }`.
- Produces: `getClient(): Promise<SupabaseClient|null>` (null si no hay key o falló el CDN).
- Produces: `auth.js` → `getSession(): Promise<Session|null>`, `currentUser(): User|null`, `onAuthChange(cb: (session|null) => void): () => void`, `signInWithGoogle(): Promise<void>`, `signOut(): Promise<void>`.
- Produces: `mountAccountCard(section: HTMLElement): () => void` (devuelve la limpieza).

- [ ] **Step 1: `authStorage` en `local.js`**

Agregar al final de `src/store/local.js`:

```js
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
```

Y en el comentario de arriba del archivo, cambiar el párrafo "Cuando llegue Supabase se crea supabase.js…" por:

```js
// store.js no lo usa directo: pasa por synced.js, que guarda acá y además
// anota los cambios para subirlos a Supabase (ver sync.js).
```

- [ ] **Step 2: `src/store/supabase.js`**

```js
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
```

- [ ] **Step 3: `src/store/auth.js`**

```js
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
```

- [ ] **Step 4: Bloque "Cuenta" (versión login)**

`src/views/perfil/account-card.js`:

```js
/* ============================================
   Views — Perfil Cuenta
   ============================================ */

// Bloque "Cuenta" de Perfil: entrar con Google o, con sesión, el mail
// y el botón para salir.
//
//   const off = mountAccountCard(section);   // off() al salir de la vista

import { currentUser, onAuthChange, signInWithGoogle } from "../../store/auth.js";
import { escapeHTML } from "../../utils/html.js";
import { toast } from "../../components/toast/toast.js";

export function mountAccountCard(section) {
  const paint = () => {
    const user = currentUser();
    section.innerHTML = user
      ? `
        <h2 class="card__title">Cuenta</h2>
        <p class="card__text">${escapeHTML(user.email)}</p>
      `
      : `
        <h2 class="card__title">Cuenta</h2>
        <p class="card__text">Guardá tus datos y usalos en todos tus dispositivos.</p>
        <button class="btn btn--primary" type="button" data-login>Entrar con Google</button>
      `;
  };

  section.addEventListener("click", async (event) => {
    if (!event.target.closest("[data-login]")) return;
    try {
      await signInWithGoogle();
    } catch (error) {
      toast(error.message);
    }
  });

  paint();
  return onAuthChange(paint);
}
```

- [ ] **Step 5: Montarlo en Perfil**

En `src/views/perfil/perfil.js`:

1. Import: `import { mountAccountCard } from "./account-card.js";`
2. Primer bloque del template (antes de "Vos"):

```html
    <section class="card content-reveal-position-sm" data-account></section>
```

3. Después de pintar, antes del `subscribe("habit"…)`:

```js
  const offAccount = mountAccountCard(root.querySelector("[data-account]"));
```

4. Cambiar el `return off;` por:

```js
  return () => {
    off();
    offAccount();
  };
```

- [ ] **Step 6: Llamar a `getSession()` al arrancar**

En `src/main.js`, importar `import { getSession } from "./store/auth.js";` y al final de `start()`, después de `watchDayChange();`:

```js
  // Sesión con Google (no se espera: la app ya está pintada con lo local)
  getSession();
```

(En la Task 5 esto se reemplaza por `initAccount()`.)

- [ ] **Step 7: Verificar sin sesión**

Correr `node --test 'tests/**/*.test.js'` → todo en PASS (no se tocó lógica).
Abrir el preview `static-server` en `http://localhost:4173/#/perfil`: aparece el bloque "Cuenta" con "Entrar con Google"; la consola no tiene errores; el resto de la app anda igual.
Con `SUPABASE_KEY` vacía, el botón muestra el toast «No se pudo conectar con el servidor. Probá de nuevo.».

- [ ] **Step 8: Verificar el login (con el dueño)**

Requiere el cliente OAuth de Google configurado (tabla de bloqueantes). Tocar "Entrar con Google" → redirige a `accounts.google.com`. El dueño elige su cuenta → vuelve a `http://localhost:4173/` sin `?code=` en la URL → en `#/perfil` el bloque muestra su mail. Recargar: la sesión sigue.

- [ ] **Step 9: Commit**

```bash
git add src/store/local.js src/store/supabase.js src/store/auth.js src/views/perfil/account-card.js src/views/perfil/perfil.js src/main.js
git commit -m "Login con Google: cliente de Supabase, sesión y bloque Cuenta en Perfil"
```

---

### Task 3: Lógica pura de la subida

**Files:**
- Create: `src/utils/sync.js`
- Test: `tests/sync.test.js`

**Interfaces:**
- Produces:
  - `COLLECTION_KEYS: string[]` = `["habit","habit_log","water_log","steps_log","workout","meal","sleep","mood","lab_result","body","rutina","sesion_fuerza","ejercicio"]`
  - `DOC_KEYS: string[]` = `["profile","objetivos","lab_range","entreno_actual"]`
  - `diffRows(prev: Row[]|null, next: Row[]|null) → { upserts: Row[], deletes: string[] }`
  - `toRemoteRow(row: Row) → { id, date: string|null, data: Row }`
  - `outboxEntriesFor(key: string, prev, next) → Entry[]`, donde `Entry = { table, id, op: "upsert"|"delete", row?, value? }` (`user_doc`: `{ table: "user_doc", id: key, op: "upsert", value }`)
  - `coalesceOutbox(queue: Entry[], entries: Entry[]) → Entry[]`
  - `removeSent(queue: Entry[], sent: Entry[]) → Entry[]`

- [ ] **Step 1: Escribir los tests**

`tests/sync.test.js`:

```js
/* ============================================
   Tests — Sync
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diffRows,
  toRemoteRow,
  outboxEntriesFor,
  coalesceOutbox,
  removeSent,
} from "../src/utils/sync.js";

/* ---------------------------------------- */
/* Subida */
/* ---------------------------------------- */

test("diffRows: filas nuevas y cambiadas se suben, las iguales no", () => {
  const prev = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  const next = [{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "c", v: 1 }];
  assert.deepEqual(diffRows(prev, next), {
    upserts: [{ id: "b", v: 2 }, { id: "c", v: 1 }],
    deletes: [],
  });
});

test("diffRows: las que faltan se borran", () => {
  assert.deepEqual(diffRows([{ id: "a" }, { id: "b" }], [{ id: "a" }]), { upserts: [], deletes: ["b"] });
});

test("diffRows: sin valor anterior, todo es nuevo", () => {
  assert.deepEqual(diffRows(null, [{ id: "a" }]), { upserts: [{ id: "a" }], deletes: [] });
});

test("toRemoteRow: date sale de date o de fecha (Fuerza)", () => {
  const steps = { id: "x", date: "2026-10-06", steps: 5 };
  assert.deepEqual(toRemoteRow(steps), { id: "x", date: "2026-10-06", data: steps });

  const session = { id: "s", fecha: "2026-10-01", rutina: "A" };
  assert.equal(toRemoteRow(session).date, "2026-10-01");

  assert.equal(toRemoteRow({ id: "h", name: "Ritmo" }).date, null);
});

test("outboxEntriesFor: colección → una entrada por fila", () => {
  const row = { id: "w", date: "2026-10-06", glasses: 2 };
  assert.deepEqual(outboxEntriesFor("water_log", [], [row]), [
    { table: "water_log", id: "w", op: "upsert", row },
  ]);
  assert.deepEqual(outboxEntriesFor("habit", [{ id: "h" }], []), [
    { table: "habit", id: "h", op: "delete" },
  ]);
});

test("outboxEntriesFor: objeto → user_doc, solo si cambió", () => {
  assert.deepEqual(outboxEntriesFor("profile", { name: "A" }, { name: "B" }), [
    { table: "user_doc", id: "profile", op: "upsert", value: { name: "B" } },
  ]);
  assert.deepEqual(outboxEntriesFor("profile", { name: "A" }, { name: "A" }), []);
  assert.deepEqual(outboxEntriesFor("entreno_actual", { inicio: "x" }, null), [
    { table: "user_doc", id: "entreno_actual", op: "upsert", value: null },
  ]);
});

test("outboxEntriesFor: claves internas no se suben", () => {
  assert.deepEqual(outboxEntriesFor("_sync", null, { user_id: "u" }), []);
  assert.deepEqual(outboxEntriesFor("_outbox", [], [{ id: "x" }]), []);
});

test("coalesceOutbox: la entrada nueva de una fila reemplaza a la vieja", () => {
  const queue = [
    { table: "habit", id: "a", op: "upsert", row: { id: "a", v: 1 } },
    { table: "meal", id: "a", op: "upsert", row: { id: "a" } },
  ];
  const entries = [{ table: "habit", id: "a", op: "delete" }];
  assert.deepEqual(coalesceOutbox(queue, entries), [
    { table: "meal", id: "a", op: "upsert", row: { id: "a" } },
    { table: "habit", id: "a", op: "delete" },
  ]);
});

test("removeSent: saca lo que se mandó, deja lo que cambió mientras tanto", () => {
  const sentA = { table: "habit", id: "a", op: "upsert", row: { id: "a", v: 1 } };
  const oldB = { table: "habit", id: "b", op: "upsert", row: { id: "b", v: 1 } };
  const newB = { table: "habit", id: "b", op: "upsert", row: { id: "b", v: 2 } };
  assert.deepEqual(removeSent([sentA, newB], [sentA, oldB]), [newB]);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `node --test 'tests/**/*.test.js'`
Expected: FAIL en `tests/sync.test.js` con `Cannot find module '…/src/utils/sync.js'`.

- [ ] **Step 3: Implementar**

`src/utils/sync.js`:

```js
/* ============================================
   Utils — Sync
   ============================================ */

// Lógica pura de la sincronización con Supabase (sin red ni storage):
// qué cambió, qué subir, cómo unir lo que baja. La usa store/sync.js.
//
// Una "entrada" de la cola de pendientes es:
//   { table: "habit", id: "<id de la fila>", op: "upsert", row: {...} }
//   { table: "habit", id: "<id de la fila>", op: "delete" }
//   { table: "user_doc", id: "profile", op: "upsert", value: {...} }

// Claves del store que son listas de filas → una tabla cada una
export const COLLECTION_KEYS = [
  "habit", "habit_log", "water_log", "steps_log", "workout", "meal", "sleep",
  "mood", "lab_result", "body", "rutina", "sesion_fuerza", "ejercicio",
];

// Claves del store que son un solo objeto → filas de la tabla user_doc
export const DOC_KEYS = ["profile", "objetivos", "lab_range", "entreno_actual"];

/* ---------------------------------------- */
/* Subida */
/* ---------------------------------------- */

// Compara dos versiones de una lista por id.
// Las filas se comparan como JSON: si una igual quedó con las claves en otro
// orden se sube de más, que no rompe nada.
export function diffRows(prev, next) {
  const before = new Map((prev ?? []).map((row) => [row.id, row]));
  const after = new Map((next ?? []).map((row) => [row.id, row]));

  const upserts = [...after.values()].filter(
    (row) => !before.has(row.id) || JSON.stringify(before.get(row.id)) !== JSON.stringify(row),
  );
  const deletes = [...before.keys()].filter((id) => !after.has(id));
  return { upserts, deletes };
}

// Fila de la app → columnas de la tabla. `date` sirve para filtrar por día
// (Fuerza la llama `fecha`); el resto va entero en `data`.
export function toRemoteRow(row) {
  return { id: row.id, date: row.date ?? row.fecha ?? null, data: row };
}

// Lo que hay que anotar en la cola cuando el store guarda `next` en `key`
export function outboxEntriesFor(key, prev, next) {
  if (DOC_KEYS.includes(key)) {
    if (JSON.stringify(prev) === JSON.stringify(next)) return [];
    return [{ table: "user_doc", id: key, op: "upsert", value: next }];
  }
  if (!COLLECTION_KEYS.includes(key)) return [];

  const { upserts, deletes } = diffRows(prev, next);
  return [
    ...upserts.map((row) => ({ table: key, id: row.id, op: "upsert", row })),
    ...deletes.map((id) => ({ table: key, id, op: "delete" })),
  ];
}

const entryKey = (entry) => `${entry.table}:${entry.id}`;

// Suma entradas a la cola dejando una sola por fila (vale el último estado)
export function coalesceOutbox(queue, entries) {
  const incoming = new Set(entries.map(entryKey));
  return [...queue.filter((entry) => !incoming.has(entryKey(entry))), ...entries];
}

// Después de subir: saca de la cola exactamente lo que se mandó. Si mientras
// subía llegó un cambio nuevo de la misma fila, ese queda para la próxima.
export function removeSent(queue, sent) {
  const sentJSON = new Set(sent.map((entry) => JSON.stringify(entry)));
  return queue.filter((entry) => !sentJSON.has(JSON.stringify(entry)));
}
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `node --test 'tests/**/*.test.js'`
Expected: PASS (todos, incluidos los tests viejos).

- [ ] **Step 5: Commit**

```bash
git add src/utils/sync.js tests/sync.test.js
git commit -m "Sync: lógica pura de la subida (diferencias y cola)"
```

---

### Task 4: Lógica pura de la bajada y del estado

**Files:**
- Modify: `src/utils/sync.js` (agregar al final)
- Modify: `tests/sync.test.js` (agregar al final y sumar los imports)

**Interfaces:**
- Consumes: el módulo de la Task 3.
- Produces:
  - `mergeRemote(localRows: Row[]|null, remoteRows: {id, data, deleted_at}[], pendingIds?: Set<string>) → Row[]`
  - `dedupeByDate(rows: Row[], newestIds?: string[]) → { rows: Row[], deletedIds: string[] }` (`newestIds`: ids que bajaron, de más viejo a más nuevo)
  - `latestUpdatedAt(rows: {updated_at: string}[]) → string|null`
  - `cursorWithMargin(iso: string|null, seconds = 60) → string|null`
  - `USER_DATA_KEYS: string[]` y `hasLocalUserData(data: Record<string, Row[]|null>) → boolean`
  - `syncStatusText(status: { pending: number, lastSyncAt: string|null, online: boolean, error: boolean }, now?: Date) → string`

- [ ] **Step 1: Escribir los tests**

Sumar al import de `tests/sync.test.js`: `mergeRemote, dedupeByDate, latestUpdatedAt, cursorWithMargin, hasLocalUserData, syncStatusText`. Agregar al final:

```js
/* ---------------------------------------- */
/* Bajada */
/* ---------------------------------------- */

test("mergeRemote: reemplaza, agrega y saca las borradas", () => {
  const local = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  const remote = [
    { id: "a", data: { id: "a", v: 2 }, deleted_at: null },
    { id: "b", data: { id: "b", v: 1 }, deleted_at: "2026-10-06T10:00:00+00:00" },
    { id: "c", data: { id: "c", v: 1 }, deleted_at: null },
  ];
  assert.deepEqual(mergeRemote(local, remote), [{ id: "a", v: 2 }, { id: "c", v: 1 }]);
});

test("mergeRemote: lo que todavía no se subió gana", () => {
  const local = [{ id: "a", v: 1 }];
  const remote = [{ id: "a", data: { id: "a", v: 2 }, deleted_at: null }];
  assert.deepEqual(mergeRemote(local, remote, new Set(["a"])), [{ id: "a", v: 1 }]);
});

test("mergeRemote: borrar algo que no está no hace nada", () => {
  const remote = [{ id: "z", data: { id: "z" }, deleted_at: "2026-10-06T10:00:00+00:00" }];
  assert.deepEqual(mergeRemote([{ id: "a" }], remote), [{ id: "a" }]);
  assert.deepEqual(mergeRemote(null, []), []);
});

test("dedupeByDate: una fila por día, gana la que bajó más nueva", () => {
  const rows = [
    { id: "m", date: "2026-10-06", steps: 100 },   // a mano
    { id: "s", date: "2026-10-06", steps: 900 },   // del Atajo
    { id: "x", date: "2026-10-05", steps: 5 },
  ];
  assert.deepEqual(dedupeByDate(rows, ["s"]), {
    rows: [{ id: "s", date: "2026-10-06", steps: 900 }, { id: "x", date: "2026-10-05", steps: 5 }],
    deletedIds: ["m"],
  });
});

test("dedupeByDate: si ninguna bajó, queda la última", () => {
  const rows = [{ id: "m", date: "2026-10-06" }, { id: "n", date: "2026-10-06" }];
  assert.deepEqual(dedupeByDate(rows), { rows: [{ id: "n", date: "2026-10-06" }], deletedIds: ["m"] });
});

test("latestUpdatedAt: el más nuevo, o null", () => {
  const rows = [
    { updated_at: "2026-10-06T10:00:00.5+00:00" },
    { updated_at: "2026-10-06T12:00:00+00:00" },
    { updated_at: "2026-10-06T11:00:00+00:00" },
  ];
  assert.equal(latestUpdatedAt(rows), "2026-10-06T12:00:00+00:00");
  assert.equal(latestUpdatedAt([]), null);
});

test("cursorWithMargin: 60 segundos antes", () => {
  assert.equal(cursorWithMargin("2026-10-06T12:00:00+00:00"), "2026-10-06T11:59:00.000Z");
  assert.equal(cursorWithMargin(null), null);
});

test("hasLocalUserData: cuenta registros, no hábitos ni perfil", () => {
  assert.equal(hasLocalUserData({ habit: [{ id: "h" }], habit_log: [] }), false);
  assert.equal(hasLocalUserData({ water_log: [{ id: "w" }] }), true);
  assert.equal(hasLocalUserData({}), false);
});

/* ---------------------------------------- */
/* Estado */
/* ---------------------------------------- */

test("syncStatusText", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  const base = { pending: 0, lastSyncAt: null, online: true, error: false };

  assert.equal(syncStatusText({ ...base, online: false }, now), "Sin conexión");
  assert.equal(syncStatusText({ ...base, online: false, pending: 2 }, now), "Sin conexión · 2 cambios sin subir");
  assert.equal(syncStatusText({ ...base, pending: 1 }, now), "1 cambio sin subir");
  assert.equal(syncStatusText({ ...base, error: true }, now), "No se pudo sincronizar");
  assert.equal(syncStatusText(base, now), "Sincronizando…");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-06T11:59:30Z" }, now), "Sincronizado recién");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-06T11:58:00Z" }, now), "Sincronizado hace 2 min");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-06T09:00:00Z" }, now), "Sincronizado hace 3 h");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-05T11:00:00Z" }, now), "Sincronizado hace 1 día");
  assert.equal(syncStatusText({ ...base, lastSyncAt: "2026-10-03T12:00:00Z" }, now), "Sincronizado hace 3 días");
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `node --test 'tests/**/*.test.js'`
Expected: FAIL: `mergeRemote` (y las demás) no son funciones / no se exportan.

- [ ] **Step 3: Implementar**

Agregar al final de `src/utils/sync.js`:

```js
/* ---------------------------------------- */
/* Bajada */
/* ---------------------------------------- */

// Une lo que bajó (filas de la tabla: { id, data, deleted_at }) con la lista
// local. Si una fila tiene un cambio local que todavía no se subió
// (pendingIds), se respeta el local: se va a subir y va a ganar.
export function mergeRemote(localRows, remoteRows, pendingIds = new Set()) {
  const rows = new Map((localRows ?? []).map((row) => [row.id, row]));
  for (const remote of remoteRows) {
    if (pendingIds.has(remote.id)) continue;
    if (remote.deleted_at) rows.delete(remote.id);
    else rows.set(remote.id, remote.data);
  }
  return [...rows.values()];
}

// Para las colecciones de una fila por día (steps_log): si quedaron dos del
// mismo día (cargado a mano sin red + el Atajo), queda la que bajó más nueva
// (newestIds va de más vieja a más nueva); si ninguna bajó, la última.
export function dedupeByDate(rows, newestIds = []) {
  const rank = new Map(newestIds.map((id, index) => [id, index + 1]));
  const keep = new Map(); // date → fila que queda

  for (const row of rows) {
    const current = keep.get(row.date);
    if (!current || (rank.get(row.id) ?? 0) >= (rank.get(current.id) ?? 0)) keep.set(row.date, row);
  }

  const kept = new Set([...keep.values()].map((row) => row.id));
  return {
    rows: rows.filter((row) => kept.has(row.id)),
    deletedIds: rows.filter((row) => !kept.has(row.id)).map((row) => row.id),
  };
}

// El updated_at más nuevo de lo que bajó: el cursor de la próxima vez
export function latestUpdatedAt(rows) {
  let latest = null;
  for (const row of rows) {
    if (latest === null || Date.parse(row.updated_at) > Date.parse(latest)) latest = row.updated_at;
  }
  return latest;
}

// El cursor con un margen para atrás: filas que se confirmaron en paralelo
// pueden tener un updated_at apenas anterior. Repetir filas no rompe nada.
export function cursorWithMargin(iso, seconds = 60) {
  if (!iso) return null;
  return new Date(Date.parse(iso) - seconds * 1000).toISOString();
}

// Claves con datos que carga la persona (no cuentan los hábitos sembrados
// ni el perfil por defecto)
export const USER_DATA_KEYS = [
  "habit_log", "water_log", "steps_log", "workout", "meal", "sleep",
  "mood", "lab_result", "body", "sesion_fuerza",
];

export function hasLocalUserData(data) {
  return USER_DATA_KEYS.some((key) => Array.isArray(data[key]) && data[key].length > 0);
}

/* ---------------------------------------- */
/* Estado */
/* ---------------------------------------- */

const changes = (count) => (count === 1 ? "1 cambio" : `${count} cambios`);

// Texto del estado para el bloque "Cuenta" de Perfil
export function syncStatusText({ pending, lastSyncAt, online, error }, now = new Date()) {
  if (!online) return pending ? `Sin conexión · ${changes(pending)} sin subir` : "Sin conexión";
  if (pending) return `${changes(pending)} sin subir`;
  if (error) return "No se pudo sincronizar";
  if (!lastSyncAt) return "Sincronizando…";

  const minutes = Math.floor((now - new Date(lastSyncAt)) / 60_000);
  if (minutes < 1) return "Sincronizado recién";
  if (minutes < 60) return `Sincronizado hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Sincronizado hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Sincronizado hace ${days} ${days === 1 ? "día" : "días"}`;
}
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `node --test 'tests/**/*.test.js'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/sync.js tests/sync.test.js
git commit -m "Sync: lógica pura de la bajada y texto de estado"
```

---

### Task 5: Sincronización en la app

**Files:**
- Create: `src/store/sync.js`
- Create: `src/store/synced.js`
- Create: `src/store/account.js`
- Create: `src/utils/download.js`
- Modify: `src/store/store.js` (import del adaptador y comentario)
- Modify: `src/main.js` (`getSession()` → `initAccount()`)
- Modify: `src/views/perfil/account-card.js` (estado + cerrar sesión)
- Modify: `src/views/perfil/perfil.js` (exportar con `downloadJSON`, texto de "Tus datos")
- Modify: `CLAUDE.md` (arquitectura y regla de datos)

**Interfaces:**
- Consumes: Task 2 (`getClient`, `auth.js`), Tasks 3–4 (`utils/sync.js`), `exportData()` de `store/backup.js`.
- Produces:
  - `sync.js` → `isActive(): boolean`, `start(session, { confirmReplace: () => Promise<boolean> }): Promise<"ok"|"cancelled"|"error">`, `stop(): void`, `enqueue(entries: Entry[]): Promise<void>`, `syncNow(): Promise<void>`, `push(): Promise<void>`, `getStatus(): Promise<{ pending, lastSyncAt, online, error }>`, `onStatusChange(cb): () => void`, `clearLocalData(): Promise<void>`.
  - `synced.js` → `read(key)`, `write(key, value)`, `remove(key)` (misma firma que `local.js`).
  - `account.js` → `initAccount(): Promise<void>`, `login(): Promise<void>`, `logout(): Promise<void>`.
  - `download.js` → `downloadJSON(data: unknown, filename: string): void`.

- [ ] **Step 1: `src/utils/download.js`**

```js
/* ============================================
   Utils — Download
   ============================================ */

// Descarga `data` como archivo .json (Exportar en Perfil y la copia de
// seguridad antes de reemplazar datos en el primer login).

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
```

En `src/views/perfil/perfil.js`, importar `downloadJSON` y reemplazar el cuerpo del listener de `[data-export]` por:

```js
    downloadJSON(await exportData(), `pulso-backup-${todayKey()}.json`);
```

y el texto del bloque "Tus datos" por:

```html
      <p class="card__text">Exportá una copia de tus datos de vez en cuando, o importá una que ya tengas.</p>
```

- [ ] **Step 2: `src/store/sync.js`**

```js
/* ============================================
   Store — Sync
   ============================================ */

// Sincronización con Supabase. Ver docs/superpowers/specs/2026-10-06-supabase-sync-design.md
//
//   Subir: cada write() del store anota sus cambios en la cola "_outbox"
//          (synced.js → enqueue) y push() los manda. Lo que falla queda en
//          la cola y se reintenta.
//   Bajar: pull() trae de cada tabla lo que cambió desde la última vez
//          (un cursor por tabla en "_sync") y lo escribe directo con
//          local.js, sin pasar por la cola.
//
// Cuándo: al arrancar con sesión, al volver a la app, al volver la red y
// después de cada cambio (subida con una espera corta para juntar varios).
// Lo que decide algo son funciones puras en utils/sync.js.

import * as local from "./local.js";
import { getClient } from "./supabase.js";
import {
  COLLECTION_KEYS,
  DOC_KEYS,
  outboxEntriesFor,
  toRemoteRow,
  coalesceOutbox,
  removeSent,
  mergeRemote,
  dedupeByDate,
  latestUpdatedAt,
  cursorWithMargin,
  hasLocalUserData,
} from "../utils/sync.js";

const PAGE = 1000;          // Supabase devuelve como máximo 1000 filas por pedido
const PUSH_DELAY = 1000;    // ms de espera para juntar cambios seguidos

let client = null;
let userId = null;
let lastSyncAt = null;
let lastError = null;
let syncing = null;                    // syncNow() en curso
let pushing = null;                    // push() en curso
let pushAgain = false;                 // llegaron cambios mientras subía
let pushTimer = null;
let outboxChain = Promise.resolve();   // cambios de la cola, en fila
let listening = false;
const statusListeners = new Set();

export function isActive() {
  return userId !== null;
}

// Arranca la sincronización con una sesión.
//   "ok"         sincronizando
//   "cancelled"  la persona no quiso reemplazar sus datos (hay que cerrar la sesión)
//   "error"      no se pudo hablar con Supabase (se reintenta la próxima vez)
export async function start(session, { confirmReplace }) {
  client = await getClient();
  if (!client) return "error";
  userId = session.user.id;

  try {
    if (!(await firstLoginIfNeeded(confirmReplace))) {
      userId = null;
      return "cancelled";
    }
  } catch (error) {
    console.warn("[sync] no se pudo preparar la cuenta", error);
    userId = null;
    lastError = error;
    notifyStatus();
    return "error";
  }

  listenOnce();
  syncNow();
  return "ok";
}

// Deja de sincronizar sin tocar los datos (por ejemplo, si la sesión vence)
export function stop() {
  userId = null;
  notifyStatus();
}

/* ---------------------------------------- */
/* Primer login en este dispositivo */
/* ---------------------------------------- */

// Devuelve false si la persona canceló
async function firstLoginIfNeeded(confirmReplace) {
  const state = await local.read("_sync");
  if (state?.user_id === userId) return true;

  if (await isAccountEmpty()) {
    // Primer login de la cuenta: lo de este dispositivo se sube entero
    const entries = [];
    for (const key of COLLECTION_KEYS) entries.push(...outboxEntriesFor(key, [], await local.read(key)));
    for (const key of DOC_KEYS) {
      const value = await local.read(key);
      if (value != null) entries.push(...outboxEntriesFor(key, undefined, value));
    }
    await mutateOutbox(() => entries);
  } else {
    // La cuenta ya tiene datos: manda la nube
    const data = {};
    for (const key of COLLECTION_KEYS) data[key] = await local.read(key);
    if (hasLocalUserData(data) && !(await confirmReplace())) return false;

    for (const key of [...COLLECTION_KEYS, ...DOC_KEYS]) await local.remove(key);
    await mutateOutbox(() => []);
  }

  await local.write("_sync", { user_id: userId, cursors: {} });
  return true;
}

async function isAccountEmpty() {
  const results = await Promise.all(
    ["habit", "user_doc"].map((table) => client.from(table).select("*", { count: "exact", head: true })),
  );
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
  return results.every((result) => result.count === 0);
}

/* ---------------------------------------- */
/* Cola de pendientes */
/* ---------------------------------------- */

// Todos los cambios a "_outbox" pasan en fila: dos guardados seguidos no se pisan
function mutateOutbox(change) {
  outboxChain = outboxChain
    .then(async () => {
      const queue = (await local.read("_outbox")) ?? [];
      await local.write("_outbox", change(queue));
    })
    .catch((error) => console.error("[sync] no se pudo actualizar la cola", error));
  return outboxChain;
}

// Lo llama synced.js en cada write con sesión
export async function enqueue(entries) {
  await mutateOutbox((queue) => coalesceOutbox(queue, entries));
  notifyStatus();
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, PUSH_DELAY);
}

/* ---------------------------------------- */
/* Subir */
/* ---------------------------------------- */

export function push() {
  if (pushing) {
    pushAgain = true;
    return pushing;
  }
  pushing = doPush().finally(() => {
    pushing = null;
    if (pushAgain) {
      pushAgain = false;
      push();
    }
  });
  return pushing;
}

async function doPush() {
  if (!isActive() || !navigator.onLine) return;
  await outboxChain;
  const queue = (await local.read("_outbox")) ?? [];
  if (!queue.length) return;

  const sent = [];
  for (const [table, entries] of groupByTable(queue)) {
    const { error } = await sendTable(table, entries);
    if (error) console.warn(`[sync] no se pudo subir "${table}"`, error);
    else sent.push(...entries);
  }

  await mutateOutbox((current) => removeSent(current, sent));
  notifyStatus();
}

function groupByTable(queue) {
  const groups = new Map();
  for (const entry of queue) {
    if (!groups.has(entry.table)) groups.set(entry.table, []);
    groups.get(entry.table).push(entry);
  }
  return groups;
}

async function sendTable(table, entries) {
  if (table === "user_doc") {
    const rows = entries.map((entry) => ({ user_id: userId, key: entry.id, value: entry.value }));
    return client.from("user_doc").upsert(rows, { onConflict: "user_id,key" });
  }

  const upserts = entries
    .filter((entry) => entry.op === "upsert")
    .map((entry) => ({ ...toRemoteRow(entry.row), user_id: userId, deleted_at: null }));
  const deletes = entries.filter((entry) => entry.op === "delete").map((entry) => entry.id);

  if (upserts.length) {
    const result = await client.from(table).upsert(upserts, { onConflict: "user_id,id" });
    if (result.error) return result;
  }
  if (deletes.length) {
    // Borrado suave: si la fila nunca llegó al servidor, no pasa nada
    return client
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("id", deletes);
  }
  return { error: null };
}

/* ---------------------------------------- */
/* Bajar */
/* ---------------------------------------- */

// Devuelve true si cambió algo local
async function pull() {
  const state = (await local.read("_sync")) ?? { user_id: userId, cursors: {} };
  await outboxChain;
  const queue = (await local.read("_outbox")) ?? [];
  let changed = false;

  for (const table of COLLECTION_KEYS) {
    const remote = await fetchSince(table, "id, data, updated_at, deleted_at", "id", state.cursors[table]);
    if (!remote.length) continue;

    const pending = new Set(queue.filter((entry) => entry.table === table).map((entry) => entry.id));
    const before = (await local.read(table)) ?? [];
    let rows = mergeRemote(before, remote, pending);

    if (table === "steps_log") {
      const newestIds = remote.filter((row) => !row.deleted_at).map((row) => row.id);
      const result = dedupeByDate(rows, newestIds);
      rows = result.rows;
      if (result.deletedIds.length) enqueue(result.deletedIds.map((id) => ({ table, id, op: "delete" })));
    }

    if (JSON.stringify(rows) !== JSON.stringify(before)) {
      await local.write(table, rows);
      changed = true;
    }
    state.cursors[table] = latestUpdatedAt(remote);
  }

  const docs = await fetchSince("user_doc", "key, value, updated_at", "key", state.cursors.user_doc);
  for (const doc of docs) {
    if (!DOC_KEYS.includes(doc.key)) continue;
    if (queue.some((entry) => entry.table === "user_doc" && entry.id === doc.key)) continue;
    if (JSON.stringify(await local.read(doc.key)) !== JSON.stringify(doc.value)) {
      await local.write(doc.key, doc.value);
      changed = true;
    }
  }
  if (docs.length) state.cursors.user_doc = latestUpdatedAt(docs);

  await local.write("_sync", state);
  return changed;
}

// Todas las filas con updated_at > cursor, de a PAGE. Ordenadas por
// updated_at y después por id/key, para que las páginas no se mezclen.
async function fetchSince(table, columns, idColumn, cursor) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let query = client
      .from(table)
      .select(columns)
      .order("updated_at", { ascending: true })
      .order(idColumn, { ascending: true })
      .range(from, from + PAGE - 1);
    if (cursor) query = query.gt("updated_at", cursorWithMargin(cursor));

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/* ---------------------------------------- */
/* Subir y bajar */
/* ---------------------------------------- */

export function syncNow() {
  if (!isActive()) return Promise.resolve();

  syncing ??= (async () => {
    try {
      await push();
      const changed = await pull();
      lastSyncAt = new Date().toISOString();
      lastError = null;
      // Redibuja la vista y el header con lo que llegó
      if (changed) window.dispatchEvent(new Event("pulso:refresh"));
    } catch (error) {
      lastError = error;
      console.warn("[sync] no se pudo sincronizar", error);
    } finally {
      syncing = null;
      notifyStatus();
    }
  })();

  return syncing;
}

function listenOnce() {
  if (listening) return;
  listening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncNow();
  });
  window.addEventListener("online", () => syncNow());
  window.addEventListener("offline", notifyStatus);
}

/* ---------------------------------------- */
/* Estado */
/* ---------------------------------------- */

export async function getStatus() {
  await outboxChain;
  const queue = (await local.read("_outbox")) ?? [];
  return { pending: queue.length, lastSyncAt, online: navigator.onLine, error: lastError !== null };
}

export function onStatusChange(callback) {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
}

function notifyStatus() {
  statusListeners.forEach((callback) => callback());
}

/* ---------------------------------------- */
/* Cerrar sesión */
/* ---------------------------------------- */

// Borra los datos de este dispositivo (los de la cuenta quedan en Supabase)
export async function clearLocalData() {
  userId = null;
  await outboxChain;
  for (const key of [...COLLECTION_KEYS, ...DOC_KEYS, "_outbox", "_sync"]) await local.remove(key);
}
```

- [ ] **Step 3: `src/store/synced.js`**

```js
/* ============================================
   Store — Synced
   ============================================ */

// Adaptador que usa store.js. Misma firma que local.js (read, write, remove):
// guarda en este dispositivo y, si hay sesión, anota qué filas cambiaron
// para que sync.js las suba a Supabase. Las vistas no se enteran de nada.
//
// Como compara el valor anterior con el nuevo, sirve para cualquier forma
// de guardar: add/update/remove, un set() de la lista entera (reordenar
// hábitos, importar un backup) o un set() de un objeto (el perfil).

import * as local from "./local.js";
import { outboxEntriesFor } from "../utils/sync.js";
import { isActive, enqueue } from "./sync.js";

export const read = local.read;
export const remove = local.remove;

export async function write(key, value) {
  const prev = isActive() ? await local.read(key) : null;
  await local.write(key, value);
  if (!isActive()) return;

  const entries = outboxEntriesFor(key, prev, value);
  // Sin await: la pantalla no espera a la red
  if (entries.length) enqueue(entries);
}
```

- [ ] **Step 4: Cambiar el adaptador en `store.js`**

En `src/store/store.js` reemplazar `import * as adapter from "./local.js";` por:

```js
// synced.js = local.js + la cola para subir a Supabase (ver sync.js)
import * as adapter from "./synced.js";
```

- [ ] **Step 5: `src/store/account.js`**

```js
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
```

- [ ] **Step 6: `main.js`**

En `src/main.js` reemplazar el import de `getSession` por `import { initAccount } from "./store/account.js";` y la llamada `getSession();` por:

```js
  // Cuenta y sincronización (no se espera: la app ya está pintada con lo local)
  initAccount();
```

Actualizar el comentario de arriba agregando `//   5. cuenta (sesión de Google y sincronización)`.

- [ ] **Step 7: Bloque "Cuenta" completo**

Reemplazar `src/views/perfil/account-card.js` entero:

```js
/* ============================================
   Views — Perfil Cuenta
   ============================================ */

// Bloque "Cuenta" de Perfil: entrar con Google o, con sesión, el mail,
// el estado de la sincronización y el botón para salir.
//
//   const off = mountAccountCard(section);   // off() al salir de la vista

import { currentUser, onAuthChange } from "../../store/auth.js";
import { login, logout } from "../../store/account.js";
import { getStatus, onStatusChange } from "../../store/sync.js";
import { syncStatusText } from "../../utils/sync.js";
import { escapeHTML } from "../../utils/html.js";
import { toast } from "../../components/toast/toast.js";

export function mountAccountCard(section) {
  const paint = async () => {
    const user = currentUser();
    if (!user) {
      section.innerHTML = `
        <h2 class="card__title">Cuenta</h2>
        <p class="card__text">Guardá tus datos y usalos en todos tus dispositivos.</p>
        <button class="btn btn--primary" type="button" data-login>Entrar con Google</button>
      `;
      return;
    }

    const status = await getStatus();
    section.innerHTML = `
      <h2 class="card__title">Cuenta</h2>
      <p class="card__text">${escapeHTML(user.email)}</p>
      <p class="card__text" role="status">${escapeHTML(syncStatusText(status))}</p>
      <button class="btn btn--ghost" type="button" data-logout>Cerrar sesión</button>
    `;
  };

  section.addEventListener("click", async (event) => {
    if (event.target.closest("[data-login]")) {
      try {
        await login();
      } catch (error) {
        toast(error.message);
      }
    }
    if (event.target.closest("[data-logout]")) await logout();
  });

  paint();
  const offAuth = onAuthChange(paint);
  const offStatus = onStatusChange(paint);
  const timer = setInterval(paint, 60_000); // "hace 2 min" se mantiene al día

  return () => {
    offAuth();
    offStatus();
    clearInterval(timer);
  };
}
```

- [ ] **Step 8: Actualizar `CLAUDE.md`**

En el árbol de "Architecture", reemplazar la línea de `store.js` y `local.js` por:

```
│   ├── store.js        THE data API: get, set, subscribe + add/update/remove for collections — all async
│   ├── synced.js       adapter used by store.js: local.js + queue of changes for Supabase
│   ├── local.js        localStorage adapter (the only file that touches localStorage, incl. the Supabase session)
│   ├── supabase.js     Supabase client (supabase-js loaded with dynamic import from the CDN)
│   ├── auth.js         Google sign-in session
│   ├── sync.js         push/pull with Supabase (outbox, cursors, first login)
│   ├── account.js      wires it together: start sync on session, login, logout
```

Agregar `src/config.js` (Supabase URL + publishable key) al árbol y, después del árbol, una línea `supabase/` → `migrations/ (SQL) and functions/ (Edge Functions)`.

Reemplazar el párrafo de "Data rule" por:

```markdown
**No view, component or layout file touches `localStorage` (or any storage) directly.** Everything goes through `src/store/store.js`, which writes through `synced.js`: data is saved locally first (`local.js`) and, with a session, the changed rows are queued and pushed to Supabase by `sync.js`; `sync.js` also pulls remote changes on open, focus and reconnect. Each collection key maps to a Supabase table `(id, user_id, date, data jsonb, updated_at, deleted_at)`; object keys (`profile`, `objetivos`, `lab_range`, `entreno_actual`) live in `user_doc`. A new store key must be added to `COLLECTION_KEYS` or `DOC_KEYS` in `src/utils/sync.js` (and, if it's a collection, get a table via a new migration). Spec: `docs/superpowers/specs/2026-10-06-supabase-sync-design.md`.
```

- [ ] **Step 9: Tests**

Run: `node --test 'tests/**/*.test.js'`
Expected: PASS.

- [ ] **Step 10: Verificar en el navegador**

Con el preview `static-server` (`http://localhost:4173`):

1. **Sin sesión:** la app anda igual; en DevTools › Application › Local Storage no aparece `pulso:_outbox`.
2. **Primer login con cuenta vacía:** entrar con Google. En Supabase (`execute_sql`: `select count(*) from habit;` y `select key from user_doc;`) aparecen los hábitos y el perfil del dispositivo. El bloque Cuenta dice «Sincronizado recién».
3. **Escritura:** sumar un vaso de agua en Pulso → a los ~1 s `select data from water_log order by updated_at desc limit 1;` muestra el vaso.
4. **Otro dispositivo:** abrir `http://localhost:4173` en otra ventana privada (otro storage), entrar con la misma cuenta → no pregunta nada (el dispositivo nuevo no tiene registros) y baja todo: mismos hábitos y el vaso de agua. Sumar otro vaso ahí, volver a la primera ventana (cambiar de pestaña) → aparece el segundo vaso.
5. **Borrado:** borrar una comida en una ventana → en la otra, al volver, ya no está; en Supabase la fila tiene `deleted_at`.
6. **Sin red:** DevTools › Network › Offline, sumar un vaso → Cuenta dice «Sin conexión · 1 cambio sin subir». Volver a Online → se sube solo y vuelve a «Sincronizado recién».
7. **Cerrar sesión:** "Cerrar sesión" → recarga, los datos locales vuelven a los de defecto, el bloque muestra "Entrar con Google". Entrar de nuevo → baja todo.
8. **Reemplazo:** sin sesión, cargar un vaso de agua; entrar con la cuenta (que ya tiene datos) → aparece el `confirm()`; Aceptar descarga `pulso-backup-<fecha>.json` y deja los datos de la cuenta; Cancelar deja todo como estaba y sin sesión.

Revisar la consola en cada paso: sin errores (los `console.warn` de `[sync]` solo en el paso 6).

- [ ] **Step 11: Commit**

```bash
git add src/store/sync.js src/store/synced.js src/store/account.js src/store/store.js src/utils/download.js src/main.js src/views/perfil/account-card.js src/views/perfil/perfil.js CLAUDE.md
git commit -m "Sincronización con Supabase: cola de cambios, bajada por cursor, primer login y cerrar sesión"
```

---

### Task 6: Lógica pura de los pasos (clave y validación)

**Files:**
- Create: `src/utils/token.js`
- Create: `supabase/functions/import-steps/validate.js`
- Test: `tests/token.test.js`, `tests/import-steps.test.js`

**Interfaces:**
- Produces: `newToken(bytes?: Uint8Array) → string` (`"pulso_" + base64url`), `sha256Hex(text: string) → Promise<string>`.
- Produces: `validateStepsPayload(body: unknown, now?: Date) → { ok: true, date: string, steps: number } | { ok: false, error: string }`.

- [ ] **Step 1: Escribir los tests**

`tests/token.test.js`:

```js
/* ============================================
   Tests — Token
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { newToken, sha256Hex } from "../src/utils/token.js";

test("newToken: prefijo pulso_ y base64url sin relleno", () => {
  assert.equal(newToken(new Uint8Array(32)), "pulso_" + "A".repeat(43));
  // 0xFB 0xFF → "+/8=" en base64 → "-_8" en base64url
  assert.equal(newToken(new Uint8Array([251, 255])), "pulso_-_8");
});

test("newToken: dos claves al azar no se repiten", () => {
  assert.notEqual(newToken(), newToken());
  assert.equal(newToken().length, "pulso_".length + 43);
});

test("sha256Hex: vector conocido", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
```

`tests/import-steps.test.js`:

```js
/* ============================================
   Tests — Import Steps
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStepsPayload } from "../supabase/functions/import-steps/validate.js";

const now = new Date("2026-10-06T15:00:00Z");

test("acepta el día de hoy y redondea", () => {
  assert.deepEqual(validateStepsPayload({ date: "2026-10-06", steps: 8123 }, now), { ok: true, date: "2026-10-06", steps: 8123 });
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: 8123.6 }, now).steps, 8124);
});

test("acepta pasos como texto solo si son dígitos", () => {
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: "8123" }, now).steps, 8123);
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: "8.123" }, now).ok, false);
});

test("fechas: hasta mañana (husos horarios) y hasta 30 días atrás", () => {
  assert.equal(validateStepsPayload({ date: "2026-10-07", steps: 1 }, now).ok, true);
  assert.equal(validateStepsPayload({ date: "2026-10-08", steps: 1 }, now).ok, false);
  assert.equal(validateStepsPayload({ date: "2026-09-06", steps: 1 }, now).ok, true);
  assert.equal(validateStepsPayload({ date: "2026-09-05", steps: 1 }, now).ok, false);
});

test("rechaza fechas inválidas", () => {
  assert.equal(validateStepsPayload({ date: "2026-02-30", steps: 1 }, now).ok, false);
  assert.equal(validateStepsPayload({ date: "06/10/2026", steps: 1 }, now).ok, false);
});

test("rechaza pasos fuera de rango o que faltan", () => {
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: -1 }, now).ok, false);
  assert.equal(validateStepsPayload({ date: "2026-10-06", steps: 100001 }, now).ok, false);
  assert.equal(validateStepsPayload({ date: "2026-10-06" }, now).ok, false);
  assert.equal(validateStepsPayload(null, now).ok, false);
});

test("los errores traen un mensaje para mostrar", () => {
  const result = validateStepsPayload({ date: "2026-10-08", steps: 1 }, now);
  assert.equal(typeof result.error, "string");
  assert.ok(result.error.length > 0);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `node --test 'tests/**/*.test.js'`
Expected: FAIL: no se encuentran `src/utils/token.js` ni `validate.js`.

- [ ] **Step 3: Implementar `src/utils/token.js`**

```js
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
```

- [ ] **Step 4: Implementar `supabase/functions/import-steps/validate.js`**

```js
/* ============================================
   Utils — Import Steps Validate
   ============================================ */

// Valida lo que manda el Atajo: { date: "AAAA-MM-DD", steps: 8123 }.
// JS puro (sin Deno ni Node) para poder testearlo con node:test.
//
//   validateStepsPayload(body)  → { ok: true, date, steps } | { ok: false, error }

const DAY = 86_400_000;
const MAX_STEPS = 100_000;
const MAX_DAYS_BACK = 30;

const fail = (error) => ({ ok: false, error });

export function validateStepsPayload(body, now = new Date()) {
  if (body === null || typeof body !== "object") return fail("El cuerpo tiene que ser { date, steps }.");

  const { date } = body;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail("La fecha tiene que ser AAAA-MM-DD.");
  }
  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    return fail("La fecha no existe.");
  }

  // La fecha es la del iPhone (hora local): se tolera un día de diferencia con UTC
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysFromToday = Math.round((day.getTime() - today) / DAY);
  if (daysFromToday > 1) return fail("La fecha no puede ser futura.");
  if (daysFromToday < -MAX_DAYS_BACK) return fail(`La fecha es de hace más de ${MAX_DAYS_BACK} días.`);

  // Texto solo si son dígitos: "8.123" podría ser 8123 u 8,123 según el idioma del iPhone
  const steps = typeof body.steps === "string" && /^\d+$/.test(body.steps) ? Number(body.steps) : body.steps;
  if (typeof steps !== "number" || !Number.isFinite(steps)) return fail("Los pasos tienen que ser un número.");

  const rounded = Math.round(steps);
  if (rounded < 0 || rounded > MAX_STEPS) return fail("Los pasos tienen que estar entre 0 y 100.000.");

  return { ok: true, date, steps: rounded };
}
```

- [ ] **Step 5: Correr y ver que pasan**

Run: `node --test 'tests/**/*.test.js'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/token.js supabase/functions/import-steps/validate.js tests/token.test.js tests/import-steps.test.js
git commit -m "Pasos: clave del Atajo y validación de lo que manda"
```

---

### Task 7: Edge Function `import-steps`

**Files:**
- Create: `supabase/functions/import-steps/index.ts`

**Interfaces:**
- Consumes: `validateStepsPayload` (Task 6), tablas `import_token` y `steps_log` (Task 1).
- Produces: `POST {STEPS_FUNCTION_URL}` con header `x-pulso-key` y cuerpo `{ date, steps }` → `200 { ok: true, date, steps }` | `400/401/405/500 { error }`.

- [ ] **Step 1: Escribir la función**

`supabase/functions/import-steps/index.ts`:

```ts
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
```

- [ ] **Step 2: Desplegar**

Con el conector de Supabase: `deploy_edge_function` con `name: "import-steps"`, `verify_jwt: false`, `entrypoint_path: "index.ts"` y los dos archivos (`index.ts`, `validate.js`). Sin conector: pasarle al dueño el comando (requiere la CLI de Supabase):

```bash
npx supabase functions deploy import-steps --project-ref drraruoxrvvovnhnammp --no-verify-jwt
```

- [ ] **Step 3: Probar con `curl`**

Clave inválida:

```bash
curl -s -X POST https://drraruoxrvvovnhnammp.supabase.co/functions/v1/import-steps -H "x-pulso-key: pulso_no_existe" -H "Content-Type: application/json" -d '{"date":"2026-10-06","steps":1234}'
```

Esperado: `{"error":"La clave no es válida. Generá una nueva en Pulso."}`.

Si en cambio responde un 401 del gateway pidiendo `apikey` o `authorization`, agregar `-H "apikey: <SUPABASE_KEY>"`, confirmar que así llega a la función, y anotar en la guía del Atajo (Task 8) y en la spec 5.3 que el Atajo manda también ese header.

Payload inválido (con cualquier clave): `-d '{"date":"2026-10-30","steps":1}'` → `{"error":"La fecha no puede ser futura."}`.

La prueba con una clave válida se hace en la Task 8, paso 5.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/import-steps/index.ts
git commit -m "Pasos: Edge Function que recibe los pasos del Atajo"
```

---

### Task 8: "Pasos desde Salud" en Perfil

**Files:**
- Create: `src/store/steps-token.js`
- Create: `src/views/perfil/health-card.js`
- Modify: `src/views/perfil/perfil.js` (montar el bloque)
- Modify: `src/views/perfil/perfil.css` (clave y guía)
- Modify: `src/config.js` (`SHORTCUT_URL`, cuando el dueño lo pase)
- Modify: `CLAUDE.md` (línea de `steps-token.js` en el árbol)

**Interfaces:**
- Consumes: `getClient()`, `currentUser()`, `onAuthChange()` (Task 2); `newToken`, `sha256Hex` (Task 6); `SHORTCUT_URL` (Task 1).
- Produces: `hasStepsToken(): Promise<boolean>`, `createStepsToken(): Promise<string>`; `mountHealthCard(section: HTMLElement): () => void`.

- [ ] **Step 1: `src/store/steps-token.js`**

```js
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
```

- [ ] **Step 2: `src/views/perfil/health-card.js`**

```js
/* ============================================
   Views — Perfil Salud
   ============================================ */

// Bloque "Pasos desde Salud" de Perfil (solo con sesión): genera la clave
// del Atajo, la muestra una sola vez y explica cómo dejarlo automático.
// Una web no puede leer Salud: lo hace un Atajo de iPhone que manda los
// pasos a Supabase (ver supabase/functions/import-steps).
//
//   const off = mountHealthCard(section);   // off() al salir de la vista

import { currentUser, onAuthChange } from "../../store/auth.js";
import { hasStepsToken, createStepsToken } from "../../store/steps-token.js";
import { SHORTCUT_URL } from "../../config.js";
import { escapeHTML } from "../../utils/html.js";
import { toast } from "../../components/toast/toast.js";

const GUIDE = [
  "Tocá «Copiar clave y abrir el Atajo» y después «Agregar atajo».",
  "Cuando te pida la clave, pegala.",
  "Permití que el Atajo lea tus pasos de Salud.",
  "En la app Atajos, andá a Automatización › + › Hora del día.",
  "Elegí las 23:30 (podés sumar otras, como 12:00 y 18:00) y marcá «Ejecutar de inmediato».",
  "Elegí el atajo «Pulso pasos». Listo: los pasos llegan solos a Ritmo.",
];

export function mountHealthCard(section) {
  let token = null; // la clave recién generada: se muestra solo en esta visita

  const paint = async () => {
    if (!currentUser()) {
      section.hidden = true;
      return;
    }
    const connected = token !== null || (await hasStepsToken());
    section.hidden = false;
    section.innerHTML = `
      <h2 class="card__title">Pasos desde Salud</h2>
      ${token ? tokenHTML(token) : introHTML(connected)}
      ${token || !connected ? guideHTML() : ""}
      ${connected && !token ? `<button class="btn btn--ghost" type="button" data-new-token>Generar otra clave</button>` : ""}
      ${!connected ? `<button class="btn btn--accent" type="button" data-new-token>Conectar con Salud</button>` : ""}
    `;
  };

  section.addEventListener("click", async (event) => {
    if (event.target.closest("[data-new-token]")) {
      const replacing = token !== null || (await hasStepsToken());
      if (replacing && !confirm("La clave anterior deja de funcionar y vas a tener que pegar la nueva en el Atajo. ¿Seguimos?")) return;
      try {
        token = await createStepsToken();
        paint();
      } catch (error) {
        toast(error.message);
      }
    }

    // Copiar y abrir en el mismo toque: Safari solo deja copiar durante el toque
    if (event.target.closest("[data-copy]")) {
      try {
        await navigator.clipboard.writeText(token);
        toast("Clave copiada");
      } catch {
        toast("No se pudo copiar: mantené apretada la clave para copiarla.");
      }
      if (SHORTCUT_URL) window.open(SHORTCUT_URL, "_blank", "noopener");
    }
  });

  paint();
  return onAuthChange(() => {
    token = null;
    paint();
  });
}

function introHTML(connected) {
  return connected
    ? `<p class="card__text">Conectado. Los pasos del iPhone llegan solos a Ritmo.</p>`
    : `<p class="card__text">Traé los pasos del iPhone a Ritmo sin cargarlos a mano. Se configura una sola vez.</p>`;
}

function tokenHTML(token) {
  return `
    <p class="card__text">Tu clave. Se muestra una sola vez:</p>
    <code class="perfil__token">${escapeHTML(token)}</code>
    <button class="btn btn--accent" type="button" data-copy>
      ${SHORTCUT_URL ? "Copiar clave y abrir el Atajo" : "Copiar clave"}
    </button>
    ${SHORTCUT_URL ? "" : `<p class="card__text">El Atajo todavía no está publicado.</p>`}
  `;
}

function guideHTML() {
  return `<ol class="perfil__guide">${GUIDE.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}</ol>`;
}
```

- [ ] **Step 3: Montarlo en Perfil**

En `src/views/perfil/perfil.js`:

1. Import: `import { mountHealthCard } from "./health-card.js";`
2. En el template, justo después de la sección `data-account`:

```html
    <section class="card content-reveal-position-sm" data-health-connect hidden></section>
```

3. Después de `const offAccount = …`:

```js
  const offHealth = mountHealthCard(root.querySelector("[data-health-connect]"));
```

4. En la función de limpieza sumar `offHealth();`.

- [ ] **Step 4: Estilos**

En `src/views/perfil/perfil.css`, antes del banner de RESPONSIVE (si no hay, al final):

```css
/* Clave del Atajo: se tiene que poder leer y copiar entera */
.perfil__token {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: var(--font-sm-size);
    line-height: var(--font-sm-line);
    color: var(--color-text);
    word-break: break-all;
    user-select: all;
}

/* Guía de pasos numerada */
.perfil__guide {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);
    padding-left: 20px;
    font-size: var(--card-body-size);
    line-height: var(--card-body-line);
    color: var(--color-text-muted);
}
```

Verificar que `.perfil__guide` muestre los números (si el reset de `base` quita `list-style`, sumar `list-style: decimal;`).

- [ ] **Step 5: Verificar en el navegador**

En `http://localhost:4173/#/perfil` con sesión:
1. Aparece "Pasos desde Salud" con "Conectar con Salud" (sin sesión, el bloque no aparece).
2. Tocar → aparece la clave `pulso_…`, el botón "Copiar clave" y la guía. En Supabase, `select user_id, created_at from import_token;` tiene una fila.
3. Probar la función con esa clave:

```bash
curl -s -X POST https://drraruoxrvvovnhnammp.supabase.co/functions/v1/import-steps -H "x-pulso-key: <la clave>" -H "Content-Type: application/json" -d '{"date":"<hoy AAAA-MM-DD>","steps":4321}'
```

Esperado: `{"ok":true,"date":"…","steps":4321}`. Volver a la pestaña de Pulso → Ritmo en Hoy muestra 4321 pasos.

4. Recargar Perfil → dice «Conectado…» y "Generar otra clave". Generar otra (aceptar el `confirm`) → el `curl` con la clave vieja da 401 y con la nueva, 200.
5. Revisar en mobile (375px, `resize_window` preset `mobile`) que la clave larga corta línea y no hay scroll horizontal. Volver a `desktop` al terminar.

- [ ] **Step 6: Link del Atajo (con el dueño)**

Pasarle al dueño los pasos de la spec 5.3 para armar el Atajo "Pulso pasos" (con la pregunta de importación de la clave y `x-pulso-key` en el header; si en la Task 7 hizo falta, también `apikey`). Cuando pase el link de iCloud, ponerlo en `SHORTCUT_URL` de `src/config.js` y verificar que el botón dice "Copiar clave y abrir el Atajo" y abre el link. Prueba final en el iPhone: correr el Atajo a mano → los pasos aparecen en Ritmo.

- [ ] **Step 7: CLAUDE.md**

En el árbol de `src/store/`, debajo de `account.js`, agregar:

```
│   ├── steps-token.js  key for the iPhone Shortcut that sends steps (hash in import_token)
```

- [ ] **Step 8: Tests y commit**

Run: `node --test 'tests/**/*.test.js'` → PASS.

```bash
git add src/store/steps-token.js src/views/perfil/health-card.js src/views/perfil/perfil.js src/views/perfil/perfil.css src/config.js CLAUDE.md
git commit -m "Pasos desde Salud: clave del Atajo y guía en Perfil"
```
