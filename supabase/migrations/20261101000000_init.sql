-- ============================================================
--  Confecat S.A. — Legajo digital
--  Migración inicial: esquema, triggers, RLS y permisos.
--  Ejecutar en Supabase → SQL Editor (una sola vez).
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'rrhh', 'consulta');
  end if;
  if not exists (select 1 from pg_type where typname = 'employee_status') then
    create type public.employee_status as enum ('activo', 'licencia', 'baja');
  end if;
end $$;

-- ── Perfiles de usuario (RRHH / administración) ──────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  nombre     text not null default '',
  rol        public.app_role not null default 'consulta',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Catálogos ────────────────────────────────────────────────
create table if not exists public.sectors (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint sectors_nombre_unique unique (nombre)
);

create table if not exists public.positions (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  sector_id  uuid not null references public.sectors (id) on delete restrict,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint positions_sector_nombre_unique unique (sector_id, nombre)
);

create table if not exists public.contract_types (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint contract_types_nombre_unique unique (nombre)
);

-- ── Empleados ────────────────────────────────────────────────
create table if not exists public.employees (
  id                            uuid primary key default gen_random_uuid(),
  legajo                        text not null,
  dni                           text not null,
  cuil                          text not null,
  apellido                      text not null,
  nombre                        text not null,
  fecha_nacimiento              date,
  estado_civil                  text,
  domicilio                     text,
  telefono                      text,
  email                         text,
  contacto_emergencia_nombre    text,
  contacto_emergencia_telefono  text,
  fecha_ingreso                 date not null,
  fecha_egreso                  date,
  sector_id                     uuid references public.sectors (id) on delete set null,
  position_id                   uuid references public.positions (id) on delete set null,
  categoria                     text,
  contract_type_id              uuid references public.contract_types (id) on delete set null,
  jornada_horas                 numeric(5, 2),
  sueldo_basico                 numeric(12, 2),
  banco                         text,
  cbu                           text,
  estado                        public.employee_status not null default 'activo',
  motivo_baja                   text,
  notas                         text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  created_by                    uuid references public.profiles (id) on delete set null,
  constraint employees_legajo_unique unique (legajo),
  constraint employees_dni_unique unique (dni),
  constraint employees_dni_format check (dni ~ '^[0-9]{7,8}$'),
  constraint employees_cuil_format check (cuil ~ '^[0-9]{11}$')
);

create index if not exists employees_apellido_idx on public.employees (apellido, nombre);
create index if not exists employees_sector_idx on public.employees (sector_id);
create index if not exists employees_estado_idx on public.employees (estado);
create index if not exists employees_ingreso_idx on public.employees (fecha_ingreso);

-- ── Auditoría ────────────────────────────────────────────────
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  entity     text not null,
  entity_id  uuid,
  action     text not null check (action in ('crear', 'actualizar', 'baja', 'reactivar', 'eliminar')),
  changes    jsonb not null default '{}'::jsonb,
  user_id    uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- ── Utilidades ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- Registra altas y cambios de empleados con el detalle campo por campo.
create or replace function public.audit_employees()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
  key text;
  audit_action text := 'actualizar';
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (entity, entity_id, action, changes, user_id)
    values ('employees', new.id, 'crear', '{}'::jsonb, (select id from public.profiles where id = auth.uid()));
    return new;
  end if;

  if tg_op = 'UPDATE' then
    for key in select jsonb_object_keys(to_jsonb(new)) loop
      if key = 'updated_at' then
        continue;
      end if;
      if coalesce(to_jsonb(new) ->> key, '') is distinct from coalesce(to_jsonb(old) ->> key, '') then
        diff := diff || jsonb_build_object(
          key,
          jsonb_build_object('antes', to_jsonb(old) -> key, 'despues', to_jsonb(new) -> key)
        );
      end if;
    end loop;

    if diff = '{}'::jsonb then
      return new;
    end if;

    if old.estado is distinct from new.estado then
      if new.estado = 'baja' then
        audit_action := 'baja';
      elsif old.estado = 'baja' then
        audit_action := 'reactivar';
      end if;
    end if;

    insert into public.audit_log (entity, entity_id, action, changes, user_id)
    values ('employees', new.id, audit_action, diff, (select id from public.profiles where id = auth.uid()));
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists employees_audit on public.employees;
create trigger employees_audit
  after insert or update on public.employees
  for each row execute function public.audit_employees();

-- Crea el perfil automáticamente cuando se da de alta un usuario en Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, rol)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(coalesce(new.email, ''), '@', 1)),
    'consulta'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS ──────────────────────────────────────────────────────
create or replace function public.app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid() and activo = true;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and activo = true and rol in ('admin', 'rrhh')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and activo = true and rol = 'admin'
  );
$$;

grant execute on function public.app_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.sectors enable row level security;
alter table public.positions enable row level security;
alter table public.contract_types enable row level security;
alter table public.employees enable row level security;
alter table public.audit_log enable row level security;

-- Perfiles
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Catálogos: lectura para todo el personal autenticado, escritura solo admin.
drop policy if exists "sectors_read" on public.sectors;
create policy "sectors_read" on public.sectors
  for select to authenticated using (true);

drop policy if exists "sectors_admin_write" on public.sectors;
create policy "sectors_admin_write" on public.sectors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "positions_read" on public.positions;
create policy "positions_read" on public.positions
  for select to authenticated using (true);

drop policy if exists "positions_admin_write" on public.positions;
create policy "positions_admin_write" on public.positions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "contract_types_read" on public.contract_types;
create policy "contract_types_read" on public.contract_types
  for select to authenticated using (true);

drop policy if exists "contract_types_admin_write" on public.contract_types;
create policy "contract_types_admin_write" on public.contract_types
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Empleados: lectura para autenticados, escritura para admin y RRHH.
drop policy if exists "employees_read" on public.employees;
create policy "employees_read" on public.employees
  for select to authenticated using (true);

drop policy if exists "employees_staff_insert" on public.employees;
create policy "employees_staff_insert" on public.employees
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists "employees_staff_update" on public.employees;
create policy "employees_staff_update" on public.employees
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "employees_admin_delete" on public.employees;
create policy "employees_admin_delete" on public.employees
  for delete to authenticated
  using (public.is_admin());

-- Auditoría: lectura para autenticados; las escrituras las hace el trigger
-- (security definer), no la aplicación.
drop policy if exists "audit_read" on public.audit_log;
create policy "audit_read" on public.audit_log
  for select to authenticated using (true);

-- ── Permisos de tabla ────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
