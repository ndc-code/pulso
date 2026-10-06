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
