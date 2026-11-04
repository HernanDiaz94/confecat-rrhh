-- ============================================================
--  Confecat S.A. — Catálogos iniciales
--  Ejecutar después de la migración inicial. Es idempotente.
-- ============================================================

insert into public.sectors (id, nombre) values
  ('00000000-0000-4000-8000-000000000001', 'Administración'),
  ('00000000-0000-4000-8000-000000000002', 'Corte'),
  ('00000000-0000-4000-8000-000000000003', 'Costura'),
  ('00000000-0000-4000-8000-000000000004', 'Terminación'),
  ('00000000-0000-4000-8000-000000000005', 'Depósito'),
  ('00000000-0000-4000-8000-000000000006', 'Mantenimiento'),
  ('00000000-0000-4000-8000-000000000007', 'Calidad')
on conflict (nombre) do nothing;

insert into public.positions (sector_id, nombre)
select s.id, p.nombre
from public.sectors s
join (values
  ('Administración', 'Jefe de Personal'),
  ('Administración', 'Analista de RRHH'),
  ('Administración', 'Administrativo'),
  ('Administración', 'Recepcionista'),
  ('Corte', 'Supervisor de Corte'),
  ('Corte', 'Cortador'),
  ('Corte', 'Ayudante de Corte'),
  ('Costura', 'Supervisora de Costura'),
  ('Costura', 'Costurera'),
  ('Costura', 'Ayudante de Costura'),
  ('Terminación', 'Encargado de Terminación'),
  ('Terminación', 'Planchador'),
  ('Terminación', 'Revisor'),
  ('Depósito', 'Jefe de Depósito'),
  ('Depósito', 'Operario de Depósito'),
  ('Depósito', 'Chofer'),
  ('Mantenimiento', 'Jefe de Mantenimiento'),
  ('Mantenimiento', 'Mecánico'),
  ('Mantenimiento', 'Electricista'),
  ('Calidad', 'Analista de Calidad'),
  ('Calidad', 'Controlador de Calidad')
) as p (sector, nombre) on p.sector = s.nombre
on conflict (sector_id, nombre) do nothing;

insert into public.contract_types (nombre) values
  ('Permanente'),
  ('Plazo fijo'),
  ('Temporada'),
  ('Pasantía')
on conflict (nombre) do nothing;

-- ──────────────────────────────────────────────────────────────
--  Después de crear el usuario en Authentication → Users,
--  promovelo a administrador ejecutando (con su email):
--
--  update public.profiles
--     set rol = 'admin', activo = true
--   where email = 'admin@confecat.com';
--
--  Roles disponibles: 'admin' | 'rrhh' | 'consulta'
-- ──────────────────────────────────────────────────────────────
