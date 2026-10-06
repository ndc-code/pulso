# Supabase: base de datos, login con Google, sincronización y pasos desde Salud

Fecha: 2026-10-06 · Estado: diseño aprobado en chat, pendiente de revisión escrita.
Fase 5 de PULSO-SPEC (sección 7), adelantada antes de la Fase 4 (PWA).

Proyecto Supabase: `drraruoxrvvovnhnammp` → `https://drraruoxrvvovnhnammp.supabase.co`
App publicada: `https://ndc-code.github.io/pulso/` (GitHub Pages, rama `main`, raíz).

## 1. Objetivo

1. Guardar todos los datos de Pulso en Supabase, por usuario.
2. Entrar con Google y tener los mismos datos en cualquier dispositivo (celu, compu).
3. Que los pasos del día lleguen solos desde Salud (iPhone) a `steps_log`.

Sin romper lo que hay: sin sesión la app sigue funcionando igual que hoy, solo en el dispositivo.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Modelo | **Local primero.** localStorage sigue siendo la fuente que leen las vistas; Supabase se sincroniza por detrás. Login opcional. |
| Dispositivos | Sincronización entre todos los dispositivos del usuario. |
| Login | **Solo Google** (Supabase Auth, flujo PKCE). Link mágico por mail queda para más adelante. |
| Tablas | **Una tabla por entidad con columnas fijas + `data jsonb`** con la fila tal cual la guarda la app. |
| Conflictos | Gana la última escritura que llega a Supabase (por fila). |
| Pasos | Atajo de iPhone **compartido por link de iCloud** (lo arma el dueño una vez) + clave personal + Edge Function. Solo pasos; entrenamientos de Salud quedan para después. |
| App nativa | Descartada por ahora (Capacitor + HealthKit sería el paso siguiente si crece el uso en iPhone). |

Cambios respecto de PULSO-SPEC a anotar en Cowork: la Fase 5 va antes que la 4, y la sección 6 (una columna por campo) se reemplaza por el modelo `data jsonb`.

## 3. Base de datos

Migraciones SQL versionadas en `supabase/migrations/`. Se aplican con el conector de Supabase (si está autorizado) o pegándolas en el SQL editor.

### 3.1 Tablas de colecciones

Una tabla por cada colección del store, todas con la misma forma:

`habit`, `habit_log`, `water_log`, `steps_log`, `workout`, `meal`, `sleep`, `mood`, `lab_result`, `body`, `rutina`, `sesion_fuerza`, `ejercicio`

```sql
id          text        not null,               -- el id que genera la app (crypto.randomUUID)
user_id     uuid        not null default auth.uid() references auth.users on delete cascade,
date        date,                               -- row.date ?? row.fecha; null si la entidad no tiene día
data        jsonb       not null,               -- la fila completa, tal cual la guarda la app
updated_at  timestamptz not null default now(), -- lo pisa un trigger en cada insert/update
deleted_at  timestamptz,                        -- borrado suave
primary key (user_id, id)
```

- Clave primaria `(user_id, id)` y no solo `id`: dos personas que importan el mismo backup tendrían los mismos ids.
- Índice `(user_id, updated_at)` para traer solo lo que cambió.
- Trigger `set_updated_at` (`before insert or update`) que pone `updated_at = now()`. El reloj es el del servidor, no el del dispositivo.
- No se borran filas: borrar = `deleted_at = now()`, para que los otros dispositivos se enteren.

### 3.2 `user_doc`: valores únicos por usuario

Para las claves del store que son un objeto y no una lista: `profile`, `objetivos`, `lab_range`, `entreno_actual`.

```sql
user_id     uuid        not null default auth.uid() references auth.users on delete cascade,
key         text        not null,               -- "profile", "objetivos"…
value       jsonb,                              -- null válido (entreno_actual sin entrenamiento)
updated_at  timestamptz not null default now(),
primary key (user_id, key)
```

Mismo trigger de `updated_at`.

### 3.3 `import_token`: clave del Atajo

```sql
user_id     uuid        primary key default auth.uid() references auth.users on delete cascade,
token_hash  text        not null unique,        -- SHA-256 en hex; la clave nunca se guarda en texto
created_at  timestamptz not null default now()
```

Una clave activa por usuario. Generar otra pisa la fila y la anterior deja de valer.

### 3.4 Seguridad (RLS)

RLS activado en todas las tablas. Políticas para el rol `authenticated`:

- `select`, `insert`, `update`: `user_id = auth.uid()` (en insert/update también como `with check`).
- Sin política de `delete`: los borrados son suaves.

La Edge Function usa la service role key (variable de entorno de Supabase, nunca en el repo) para escribir en nombre del dueño de la clave.

## 4. Cliente

### 4.1 Archivos

```
src/config.js              URL del proyecto, publishable key, link del Atajo (públicos por diseño)
src/store/local.js         + guardado de la sesión de Supabase (sigue siendo el único que toca localStorage)
src/store/synced.js        NUEVO adaptador: envuelve local.js y anota los cambios para subir
src/store/supabase.js      NUEVO: crea el cliente de supabase-js (import dinámico desde CDN)
src/store/auth.js          NUEVO: entrar con Google, salir, sesión actual, avisos de cambio de sesión
src/store/sync.js          NUEVO: cola de pendientes, subir, bajar, primer login
src/store/steps-token.js   NUEVO: generar la clave del Atajo
src/store/store.js         cambia el import: local.js → synced.js (nada más)
src/utils/sync.js          NUEVO: lógica pura (diferencias, unión, cola, validaciones) + tests
src/views/perfil/…         bloques "Cuenta" y "Conectar con Salud"
supabase/migrations/…      SQL de tablas, RLS y triggers
supabase/functions/import-steps/index.ts     Edge Function
supabase/functions/import-steps/validate.js  validación pura, testeada con node:test
```

Las vistas y componentes no cambian, salvo Perfil.

### 4.2 Carga de supabase-js

`supabase.js` importa `@supabase/supabase-js` (versión fija) desde `cdn.jsdelivr.net` con `import()` dinámico dentro de un `try`. Si falla (sin red, CDN caído), la app arranca igual en modo local y la sincronización queda apagada hasta la próxima carga. Un `import` estático rompería toda la app sin conexión.

Opciones del cliente: `auth.flowType = "pkce"`, `detectSessionInUrl = true`, `persistSession = true` y `auth.storage` = un objeto `{ getItem, setItem, removeItem }` que expone `local.js`. Así la sesión no toca localStorage por fuera de `local.js`.

### 4.3 Adaptador `synced.js`

Misma firma que `local.js`: `read`, `write`, `remove`.

- `read(key)` → `local.read(key)`.
- `write(key, value)`:
  1. lee el valor anterior con `local.read(key)`;
  2. guarda con `local.write(key, value)`;
  3. si hay sesión, calcula los cambios con `diffRows(prev, next)` (colecciones) o compara el objeto (`user_doc`), los agrega a la cola y le pide a `sync.js` que suba (sin esperar: la escritura local no se demora).
- Sin sesión no se anota nada: el primer login sube todo igual.
- Las claves que no se sincronizan (`_sync`, `_outbox`, la sesión) pasan directo a `local.js`.

Como el diff se hace en el adaptador, sirven todos los caminos de escritura: `add/update/remove`, `set()` de una lista entera (reordenar hábitos, `seed.js`, importar backup) y `set()` de objetos.

### 4.4 Cola de pendientes (`_outbox`)

Se guarda en local (clave `_outbox`), así sobrevive a una recarga. Cada entrada es `{ table, id, op: "upsert" | "delete", row?, value? }`.

- `coalesce`: si llega otra entrada de la misma `(table, id)`, reemplaza a la anterior (vale el último estado).
- Subir: agrupa por tabla y hace `upsert` con `onConflict: "user_id,id"` (o `"user_id,key"` en `user_doc`). Un `delete` es un upsert con `deleted_at = now()`. Si sale bien, se sacan esas entradas; si falla, quedan para reintentar.
- Reintentos: al volver la red (`online`), al volver a la app y al abrirla. Nunca se manda dos veces lo mismo a la vez (un solo envío en curso).

### 4.5 Bajar cambios

Cuándo: al arrancar con sesión, al volver a la app (`visibilitychange` → visible), al volver la red y después de cada subida. Siempre sube primero lo pendiente.

Cómo: por cada tabla, `select` de las filas con `updated_at > cursor` (incluye las borradas). El cursor se guarda por tabla en `_sync` y se le restan 60 segundos para no perder filas que se confirmaron en paralelo (`mergeRemote` repite filas sin problema).

`mergeRemote(localRows, remoteRows)`:
- fila remota con `deleted_at` → se saca de la lista local;
- fila remota sin borrar → reemplaza o agrega la local con ese id (`data`);
- si un id tiene un cambio local todavía en la cola, se respeta el local (se va a subir y va a ganar).

Lo que baja se escribe con `local.write` directo, sin pasar por la cola. Si algo cambió, se dispara `pulso:refresh` (redibuja la vista y el header).

Caso especial `steps_log` (una fila por día): si después de unir hay dos filas del mismo día (carga a mano sin red + el Atajo), queda la de `updated_at` más nuevo y la otra se borra (entra a la cola como `delete`). Lo resuelve `dedupeByDate`.

### 4.6 Primer login en un dispositivo

Se detecta porque `_sync` no tiene el `user_id` de esta sesión.

1. ¿La cuenta está vacía? (sin filas en `habit` ni en `user_doc`)
   - **Sí:** se sube todo lo local (cada clave de datos como upsert) y queda sincronizado.
   - **No:** manda la nube. Si el dispositivo tiene datos cargados por la persona (`hasLocalUserData`: alguna fila en logs, entrenos, comidas, sueño, análisis, peso o sesiones), primero se pregunta: «Este dispositivo tiene datos que no están en tu cuenta. Se van a reemplazar por los de tu cuenta.», con las opciones "Descargar backup", "Reemplazar" y "Cancelar" (cancelar cierra la sesión). Después se borra lo local y se baja todo.
2. Se guarda `_sync = { user_id, cursors }`.

`seed.js` no cambia: en un dispositivo nuevo siembra los hábitos por defecto, que se reemplazan por los de la cuenta en el paso 1.

### 4.7 Cerrar sesión

1. Intenta subir la cola.
2. Si quedaron pendientes: «Hay cambios que todavía no se subieron. Si cerrás sesión se pierden.» → "Cerrar igual" / "Cancelar".
3. `signOut`, borra las claves de datos, `_outbox` y `_sync`, y recarga la app (vuelve a sembrar como la primera vez).

### 4.8 Login con Google

`signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } })`.

Google vuelve con `?code=` (PKCE) y no con `#`, así no choca con el hash router. Después de canjear el código se limpia la query con `history.replaceState`, manteniendo el `#/ruta`.

`auth.js` expone `getSession()`, `signInWithGoogle()`, `signOut()` y `onAuthChange(callback)`. En `main.js`, después del seed y antes del router: si hay sesión, `sync.start()` (que hace el primer login si corresponde, sube y baja). El router pinta igual con lo local mientras tanto.

### 4.9 Perfil: bloque "Cuenta"

Siguiendo DESIGN.md (bloque redondeado, texto chico, naranja solo para estado):

- Sin sesión: «Guardá tus datos y usalos en todos tus dispositivos.» + botón "Entrar con Google".
- Con sesión: mail; estado («Sincronizado hace 2 min» / «3 cambios sin subir» / «Sin conexión»); botón "Cerrar sesión".

## 5. Pasos desde Salud

### 5.1 Clave personal (`steps-token.js`)

1. Genera 32 bytes aleatorios (`crypto.getRandomValues`) → texto base64url con prefijo `pulso_`.
2. Calcula el SHA-256 (`crypto.subtle.digest`) → hex.
3. `upsert` en `import_token` `{ token_hash }` (RLS: solo la fila propia).
4. Devuelve la clave en texto para mostrarla **una sola vez**.

### 5.2 Edge Function `import-steps`

- `POST https://drraruoxrvvovnhnammp.supabase.co/functions/v1/import-steps`
- Desplegada con `verify_jwt = false` (el Atajo no tiene sesión de Google; la autenticación es la clave). Al implementarla, verificar si el gateway pide igual el header `apikey` (si lo pide, el Atajo manda la publishable key).
- Header `Authorization: Bearer pulso_…` · cuerpo `{ "date": "YYYY-MM-DD", "steps": 8123 }`.

Pasos:
1. `validate.js` → `validateStepsPayload({ date, steps }, nowUtc)`: fecha con formato válido, no más de 1 día después de hoy en UTC (tolera husos horarios), no más de 30 días atrás; `steps` entero entre 0 y 100.000. Si no pasa → `400` con mensaje.
2. Hash de la clave → busca `user_id` en `import_token`. Si no hay → `401`.
3. Busca en `steps_log` la fila de ese usuario y fecha sin borrar (la de `updated_at` más nuevo):
   - si existe: `data = { ...data, steps }`;
   - si no: inserta `id = crypto.randomUUID()`, `date`, `data = { id, date, steps }`.
4. Responde `200 { ok: true, date, steps }`.

Guarda el total (no suma): si el Atajo corre varias veces en el día queda el último valor.

### 5.3 Atajo compartido

Lo arma el dueño una vez en su iPhone y lo comparte con un link de iCloud, que va en `config.js` (`SHORTCUT_URL`). Acciones:

1. *Texto* con la clave → **pregunta de importación**: «Pegá la clave que te dio Pulso».
2. *Buscar muestras de salud*: tipo Pasos, fecha de inicio hoy.
3. *Calcular estadísticas*: suma.
4. *Formatear fecha*: hoy, formato `yyyy-MM-dd`.
5. *Obtener contenido de URL*: POST a la función, headers `Authorization: Bearer <clave>` y `Content-Type: application/json`, cuerpo JSON `{ date, steps }`.

### 5.4 Perfil: bloque "Conectar con Salud"

Solo con sesión iniciada.

1. "Conectar con Salud" → genera la clave, la copia al portapapeles y abre `SHORTCUT_URL`. La clave queda visible en pantalla con un botón "Copiar" por si el portapapeles falla.
2. Guía corta, paso a paso: agregar el Atajo → pegar la clave → permitir Salud → Atajos › Automatización › Nueva › Hora del día (12:00, 18:00, 23:30) › Ejecutar de inmediato › elegir "Pulso pasos".
3. Si ya hay clave: «Conectado» + "Generar otra clave" (invalida la anterior).

La hoja manual de Ritmo queda igual. Si un día se carga a mano, la próxima corrida del Atajo pisa ese número.

## 6. Lógica pura y tests (TDD)

En `src/utils/sync.js`, con su test en `tests/sync.test.js` escrito antes del código:

| Función | Qué hace |
|---|---|
| `diffRows(prev, next)` | `{ upserts: [rows], deletes: [ids] }` comparando por id (filas iguales no se suben) |
| `toRemoteRow(row)` | `{ id, date, data }` (`date` = `row.date ?? row.fecha ?? null`) |
| `mergeRemote(local, remote, pendingIds)` | une lo que bajó con lo local (4.5) |
| `coalesceOutbox(queue, entries)` | agrega a la cola, dejando una entrada por `(table, id)` |
| `dedupeByDate(rows)` | una fila por día; devuelve `{ rows, deletedIds }` |
| `hasLocalUserData(data)` | ¿hay datos cargados por la persona? (4.6) |
| `cursorWithMargin(iso)` | cursor menos 60 s |

`supabase/functions/import-steps/validate.js` → `tests/import-steps.test.js` (`validateStepsPayload`).

Lo que habla con Supabase (auth, subir, bajar, la función) se verifica a mano: dos navegadores con la misma cuenta, cambios sin red, el primer login con cuenta vacía y con cuenta con datos, y un `curl` a la función.

## 7. Lo que hace el dueño

1. Autorizar el conector de Supabase para Claude (`/mcp` en una terminal con `claude`). Si no, Claude deja el SQL para pegar.
2. Google Cloud Console → crear el cliente OAuth (tipo Web) con el redirect `https://drraruoxrvvovnhnammp.supabase.co/auth/v1/callback` → pegar Client ID y Secret en Supabase › Authentication › Providers › Google.
3. Supabase › Authentication › URL Configuration → Site URL `https://ndc-code.github.io/pulso/` + Redirect URLs `https://ndc-code.github.io/pulso/` y `http://localhost:4173/`.
4. Pasar la publishable key (Settings › API Keys).
5. Con la función andando: armar el Atajo (5.3), compartirlo por iCloud y pasar el link.

## 8. Orden de implementación

Cada etapa queda andando y probada antes de pasar a la siguiente.

1. **Base:** migraciones (tablas, RLS, triggers) + `config.js`.
2. **Login:** `supabase.js`, `auth.js`, sesión en `local.js`, bloque "Cuenta".
3. **Sincronización:** `utils/sync.js` con tests → `synced.js` → `sync.js` (cola, subir, bajar, primer login, cerrar sesión).
4. **Pasos:** `import_token`, `validate.js` con tests, Edge Function, `steps-token.js`, bloque "Conectar con Salud".

## 9. Fuera de alcance

Realtime (cambios en vivo sin volver a la app), login por mail, importar entrenamientos de Salud, fotos de comidas en Storage, onboarding y PWA (Fase 4), app nativa, unión de cambios campo por campo.
