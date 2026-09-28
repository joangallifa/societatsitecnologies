-- =====================================================================
--  Línia del temps tecnològica — esquema complet de Supabase
--
--  Idempotent: es pot executar tantes vegades com calgui al SQL Editor
--  sense provocar errors (tant en un projecte nou com en un d'existent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipus: època de la tecnologia
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'era') then
    create type era as enum (
      'PREHISTORIA',
      'EDAT_ANTIGA',
      'EDAT_MITJANA',
      'EDAT_MODERNA',
      'EDAT_CONTEMPORANIA'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Taules
-- ---------------------------------------------------------------------

-- Perfil públic mínim (l'esquema auth.* no és consultable amb la clau
-- anon/authenticated; en mantenim una còpia per mostrar l'autor).
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  photo_url   text not null,
  photo_path  text,
  year        integer not null,
  era         era not null,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Columnes afegides en versions posteriors (per a instal·lacions antigues)
alter table public.entries add column if not exists photo_path text;

-- L'època és obligatòria; les entrades antigues sense època reben un
-- valor provisional perquè es puguin corregir manualment.
update public.entries set era = 'EDAT_CONTEMPORANIA' where era is null;
alter table public.entries alter column era set not null;

create index if not exists entries_year_idx      on public.entries (year);
create index if not exists entries_author_id_idx on public.entries (author_id);

-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

drop policy if exists "Els perfils són consultables per tothom" on public.profiles;
create policy "Els perfils són consultables per tothom"
  on public.profiles for select
  using (true);

drop policy if exists "Les entrades són consultables per tothom" on public.entries;
create policy "Les entrades són consultables per tothom"
  on public.entries for select
  using (true);

drop policy if exists "Els usuaris autenticats poden afegir les seves entrades" on public.entries;
create policy "Els usuaris autenticats poden afegir les seves entrades"
  on public.entries for insert
  to authenticated
  with check (auth.uid() = author_id);

-- Les polítiques d'actualitzar/esborrar entrades depenen de l'estat de
-- l'app "línia de temps" (taula app_settings) i es defineixen més avall,
-- un cop creada aquesta taula (secció 6).

-- ---------------------------------------------------------------------
-- 4. Funcions i triggers sobre auth.users
-- ---------------------------------------------------------------------

-- Anteriorment hi havia aquí un trigger que rebutjava qualsevol registre
-- amb un correu fora del domini @umanresa.cat. S'ha eliminat perquè ara
-- s'admet qualsevol domini de correu. Es deixa l'eliminació explícita per
-- si l'script s'executa sobre un projecte on encara existeixi.
drop trigger if exists restrict_email_domain_trigger on auth.users;
drop function if exists public.restrict_email_domain();

-- En crear-se un usuari, en desem una còpia mínima a public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. Storage: bucket públic per a les fotos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "Les fotos són consultables per tothom" on storage.objects;
create policy "Les fotos són consultables per tothom"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "Els usuaris autenticats poden pujar fotos" on storage.objects;
create policy "Els usuaris autenticats poden pujar fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos');

drop policy if exists "Esborrar foto pròpia, o qualsevol com a administrador" on storage.objects;
create policy "Esborrar foto pròpia, o qualsevol com a administrador"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or auth.email() = 'jgallifa@umanresa.cat'
    )
  );

-- ---------------------------------------------------------------------
-- 6. Estat de cada aplicació, controlat exclusivament per l'administrador
--    des de la pàgina d'inici. "Definicions" té un únic estat editable;
--    "línia de temps" el separa en dues fases (tecnologies i metodologies
--    SAMR/STEEP) perquè no es puguin editar totes dues coses alhora.
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  app_key    text primary key,
  status     text not null default 'EDITABLE',
  updated_at timestamptz not null default now()
);

-- Amplia els valors vàlids per a instal·lacions que ja tenien la taula
-- creada amb el check antic (OCULT/EDITABLE/CONSULTA únicament).
alter table public.app_settings drop constraint if exists app_settings_status_check;
alter table public.app_settings add constraint app_settings_status_check
  check (status in (
    'OCULT', 'EDITABLE', 'EDITAR_TECNOLOGIES', 'EDITAR_METODOLOGIES', 'CONSULTA'
  ));

insert into public.app_settings (app_key, status) values
  ('linia-temps', 'EDITAR_TECNOLOGIES'),
  ('definicions', 'EDITABLE')
on conflict (app_key) do nothing;

-- "línia de temps" ja no fa servir l'estat genèric "EDITABLE": les
-- instal·lacions existents es migren a la primera fase (tecnologies).
update public.app_settings
   set status = 'EDITAR_TECNOLOGIES'
 where app_key = 'linia-temps'
   and status = 'EDITABLE';

alter table public.app_settings enable row level security;

-- Tothom (fins i tot sense sessió) ha de poder saber quines apps es veuen.
drop policy if exists "L'estat de les aplicacions és consultable per tothom" on public.app_settings;
create policy "L'estat de les aplicacions és consultable per tothom"
  on public.app_settings for select
  using (true);

drop policy if exists "Només l'administrador pot canviar l'estat de les aplicacions" on public.app_settings;
create policy "Només l'administrador pot canviar l'estat de les aplicacions"
  on public.app_settings for update
  to authenticated
  using (auth.email() = 'jgallifa@umanresa.cat')
  with check (auth.email() = 'jgallifa@umanresa.cat');

-- Actualitzar/esborrar una entrada pròpia, o qualsevol com a administrador,
-- excepte en mode "només consulta" o durant la fase "Editar metodologies":
-- en aquests dos estats ningú pot tocar cap tecnologia, ni tan sols
-- l'administrador. (En "Ocult" i "Editar tecnologies" es manté igual.)
drop policy if exists "Actualitzar entrada pròpia, o qualsevol com a administrador" on public.entries;
create policy "Actualitzar entrada pròpia, o qualsevol com a administrador"
  on public.entries for update
  to authenticated
  using (
    (
      auth.uid() = author_id
      or auth.email() = 'jgallifa@umanresa.cat'
    )
    and (
      select status from public.app_settings where app_key = 'linia-temps'
    ) not in ('CONSULTA', 'EDITAR_METODOLOGIES')
  )
  with check (
    (
      auth.uid() = author_id
      or auth.email() = 'jgallifa@umanresa.cat'
    )
    and (
      select status from public.app_settings where app_key = 'linia-temps'
    ) not in ('CONSULTA', 'EDITAR_METODOLOGIES')
  );

drop policy if exists "Esborrar entrada pròpia, o qualsevol com a administrador" on public.entries;
create policy "Esborrar entrada pròpia, o qualsevol com a administrador"
  on public.entries for delete
  to authenticated
  using (
    (
      auth.uid() = author_id
      or auth.email() = 'jgallifa@umanresa.cat'
    )
    and (
      select status from public.app_settings where app_key = 'linia-temps'
    ) not in ('CONSULTA', 'EDITAR_METODOLOGIES')
  );

-- ---------------------------------------------------------------------
-- 7. Anàlisi SAMR i STEEP: cada alumne analitza cada tecnologia
-- ---------------------------------------------------------------------
create table if not exists public.analyses (
  id             uuid primary key default gen_random_uuid(),
  entry_id       uuid not null references public.entries (id) on delete cascade,
  author_id      uuid not null references public.profiles (id) on delete cascade,
  samr_level     text not null check (
    samr_level in ('SUBSTITUCIO', 'AUGMENT', 'MODIFICACIO', 'REDEFINICIO')
  ),
  samr_comment     text not null default '',
  steep_social     text not null,
  steep_tecnologic text not null,
  steep_economic   text not null,
  steep_ecologic   text not null,
  steep_politic    text not null,
  created_at     timestamptz not null default now(),
  unique (entry_id, author_id)
);

alter table public.analyses add column if not exists samr_comment text not null default '';

create index if not exists analyses_entry_id_idx on public.analyses (entry_id);

alter table public.analyses enable row level security;

-- Cada alumne només veu la seva pròpia anàlisi, l'administrador les veu
-- totes, i quan "línia de temps" està en mode "només consulta" tothom veu
-- les de tothom (per posar en comú les respostes un cop tancada l'activitat).
drop policy if exists "Veure l'anàlisi pròpia, o totes com a administrador" on public.analyses;
create policy "Veure l'anàlisi pròpia, o totes com a administrador"
  on public.analyses for select
  to authenticated
  using (
    auth.uid() = author_id
    or auth.email() = 'jgallifa@umanresa.cat'
    or (
      select status from public.app_settings where app_key = 'linia-temps'
    ) = 'CONSULTA'
  );

-- Només es pot afegir/editar la pròpia anàlisi, i mai en mode "només
-- consulta" ni durant la fase "Editar tecnologies" (les metodologies
-- encara no estan actives): ningú hi pot escriure, ni tan sols
-- l'administrador.
drop policy if exists "Els usuaris autenticats poden afegir la seva anàlisi" on public.analyses;
create policy "Els usuaris autenticats poden afegir la seva anàlisi"
  on public.analyses for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      select status from public.app_settings where app_key = 'linia-temps'
    ) not in ('CONSULTA', 'EDITAR_TECNOLOGIES')
  );

drop policy if exists "Els usuaris autenticats poden editar la seva anàlisi" on public.analyses;
create policy "Els usuaris autenticats poden editar la seva anàlisi"
  on public.analyses for update
  to authenticated
  using (auth.uid() = author_id)
  with check (
    auth.uid() = author_id
    and (
      select status from public.app_settings where app_key = 'linia-temps'
    ) not in ('CONSULTA', 'EDITAR_TECNOLOGIES')
  );

-- ---------------------------------------------------------------------
-- 8. Definicions de tecnologia: definició pròpia inicial i posterior
--    a la lectura d'un document (una fila per alumne, també l'admin).
-- ---------------------------------------------------------------------
create table if not exists public.definitions (
  id                 uuid primary key default gen_random_uuid(),
  author_id          uuid not null unique references public.profiles (id) on delete cascade,
  initial_definition text,
  final_definition   text,
  created_at         timestamptz not null default now()
);

alter table public.definitions enable row level security;

-- Cada alumne només veu la seva pròpia definició, l'administrador les veu
-- totes, i quan l'app està en mode "només consulta" tothom veu les de
-- tothom (per posar en comú les respostes un cop tancada l'activitat).
drop policy if exists "Veure la definició pròpia, o totes com a administrador" on public.definitions;
create policy "Veure la definició pròpia, o totes com a administrador"
  on public.definitions for select
  to authenticated
  using (
    auth.uid() = author_id
    or auth.email() = 'jgallifa@umanresa.cat'
    or (
      select status from public.app_settings where app_key = 'definicions'
    ) = 'CONSULTA'
  );

-- Només es pot afegir/editar la pròpia definició, i mai quan "definicions"
-- estigui en mode "només consulta": aleshores ningú hi pot escriure, ni
-- tan sols l'administrador.
drop policy if exists "Els usuaris autenticats poden afegir la seva definició" on public.definitions;
create policy "Els usuaris autenticats poden afegir la seva definició"
  on public.definitions for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      select status from public.app_settings where app_key = 'definicions'
    ) <> 'CONSULTA'
  );

drop policy if exists "Els usuaris autenticats poden editar la seva definició" on public.definitions;
create policy "Els usuaris autenticats poden editar la seva definició"
  on public.definitions for update
  to authenticated
  using (auth.uid() = author_id)
  with check (
    auth.uid() = author_id
    and (
      select status from public.app_settings where app_key = 'definicions'
    ) <> 'CONSULTA'
  );

-- ---------------------------------------------------------------------
-- 9. Privilegis a nivell de taula
--    (RLS només filtra files; sense aquests GRANT, PostgREST respon
--    "permission denied for table ...")
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select                 on public.profiles to anon, authenticated;
grant select                         on public.entries to anon;
grant select, insert, update, delete on public.entries to authenticated;
grant select, insert, update         on public.analyses to authenticated;
grant select, insert, update         on public.definitions to authenticated;
grant select                 on public.app_settings to anon, authenticated;
grant update                         on public.app_settings to authenticated;

-- ---------------------------------------------------------------------
-- 10. Refresca la caché d'esquema de PostgREST
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
