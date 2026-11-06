# Confecat S.A. — Gestión de Personal

Sistema interno de legajo digital para la planta de **Confecat S.A.**: altas y bajas de empleados, datos laborales, catálogos de sectores y puestos, importación masiva desde Excel e historial de cambios.

> **Estado:** MVP Fase 1 (legajo digital). Asistencia, licencias y recibos están planificados sobre esta misma base.

---

## 1. Demo rápida (sin configurar nada)

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173` y usá cualquiera de estos accesos:

| Usuario | Contraseña | Rol | Permisos |
|---|---|---|---|
| `admin` | `demo` | Administrador | Todo, incluidos catálogos |
| `rrhh` | `demo` | RRHH | Legajos e importación |
| `consulta` | `demo` | Consulta | Solo lectura |

> El campo acepta solo el nombre de usuario (`admin`) o el email completo (`admin@confecat.com`).

Si no hay variables de Supabase configuradas, la aplicación arranca en **modo demo**: los datos se guardan en `localStorage` del navegador y se cargan 30 legajos de ejemplo. Es ideal para probar el flujo completo, pero **no usar en producción**.

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Estilos | Tailwind CSS 4 |
| Datos y sesión | TanStack Query + Supabase (Postgres + Auth + RLS) |
| Excel | SheetJS (`xlsx`) |
| Iconos | lucide-react |
| Hosting | Netlify (o Vercel) |
| Costo | USD 0 en planes gratuitos |

La app tiene **dos backends intercambiables** con la misma interfaz (`src/lib/data/repo.ts`):

- `demo.ts` → `localStorage`, se activa cuando faltan las variables de entorno.
- `supabase.ts` → Postgres con seguridad por fila (RLS), se activa con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## 3. Puesta en producción

### 3.1 Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) → **New project** (plan free).
2. Guardá la contraseña de la base.
3. En **Project Settings → API** copiá:
   - `Project URL`
   - `anon public key`

### 3.2 Ejecutar el esquema

En **SQL Editor**, ejecutá en orden:

1. `supabase/migrations/20261101000000_init.sql` → tablas, triggers, RLS y permisos.
2. `supabase/migrations/20261101000100_seed_catalogs.sql` → sectores, puestos y tipos de contrato iniciales.

### 3.3 Crear los usuarios de RRHH

1. **Authentication → Users → Add user** (email + contraseña). Podés desactivar “Auto confirm” y confirmar el usuario a mano.
2. El trigger `handle_new_user` crea el perfil automáticamente con rol `consulta`.
3. Promové el rol desde **SQL Editor**:

```sql
update public.profiles
   set rol = 'admin', activo = true
 where email = 'admin@confecat.com';

-- Roles: 'admin' | 'rrhh' | 'consulta'
```

> Cada persona de RRHH necesita su propio usuario. No compartan credenciales: la auditoría registra quién hizo cada cambio.

### 3.4 Configurar el entorno local

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Reiniciá `npm run dev`. El badge de la barra superior debe decir **“Conexión segura con Supabase”** en lugar de “Modo demo”.

### 3.5 Deploy en Netlify

El repositorio ya está publicado en **GitHub (privado):**
`https://github.com/HernanDiaz94/confecat-rrhh`

1. Entrá a [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Elegí **GitHub** y autorizá el acceso al repo `confecat-rrhh`.
3. Netlify lee `netlify.toml` automáticamente: build `npm run build`, publish `dist`, Node 22,
   redirect SPA y cabeceras de seguridad. No hay que cambiar nada.
4. En **Site settings → Environment variables** cargá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
   (Si todavía no están, el primer deploy sale en **modo demo**: la app funciona, pero los datos
   quedan en el navegador del visitante.)
5. **Deploy site**. Después de cargar las variables, hacé **Deploys → Trigger deploy → Clear cache
   and deploy site** para que Vite las tome en el build.

Cada `git push` a `main` dispara un deploy automático.

**Importante:** la `anon key` es pública por diseño (protege RLS, no la clave). **Nunca** subas la `service_role key` al frontend ni a GitHub.

---

## 4. Funcionalidades del MVP

### Legajo digital
- Alta, edición y baja lógica (el legajo nunca se elimina).
- Datos personales, laborales, contacto de emergencia, banco/CBU y notas.
- Búsqueda por apellido, nombre, DNI, CUIL o legajo; filtros por sector y estado.
- Paginación, exportación a Excel y ficha con historial de cambios campo por campo.
- Validación de DNI y **dígito verificador del CUIL**; generación automática del CUIL desde el DNI.

### Importación desde Excel
1. Descargá la plantilla desde la app (hoja “Empleados” + “Instrucciones”).
2. Subí el archivo: se detectan las columnas aunque el orden cambie.
3. Vista previa con semáforo por fila: **crear / actualizar / omitir / error**, con el detalle de cada observación.
4. Opciones: actualizar legajos existentes (por DNI o legajo) y crear sectores/puestos faltantes.
5. Confirmación → resumen y descarga de errores en Excel.

Reglas de validación principales:
- Legajo, DNI, apellido, nombre, fecha de ingreso y sector obligatorios.
- DNI de 7 u 8 dígitos, único en el archivo y en la base.
- CUIL de 11 dígitos con verificador válido (si falta, se genera con prefijo 20 y se avisa).
- Fechas en `dd/mm/aaaa`; también acepta fechas nativas de Excel.
- Se detectan DNI/legajo duplicados dentro del archivo y contra legajos existentes.

### Catálogos
- Sectores, puestos (por sector) y tipos de contrato.
- No se eliminan: se desactivan para no romper legajos históricos.
- Solo el rol `admin` puede modificarlos.

### Auditoría
- Trigger en Postgres que registra altas, modificaciones, bajas y reactivaciones.
- Diff por campo (`antes` → `despues`), usuario y fecha.
- Visible en la ficha del empleado y en el panel.

---

## 5. Roles y seguridad

| Rol | Legajos | Importar | Catálogos | Usuarios |
|---|---|---|---|---|
| `admin` | Ver / crear / editar / baja | Sí | Sí | Sí |
| `rrhh` | Ver / crear / editar / baja | Sí | Solo lectura | No |
| `consulta` | Solo lectura | No | Solo lectura | No |

La seguridad se aplica en la base con **Row Level Security**:

- `employees`: lectura para autenticados; escritura solo `admin` y `rrhh`; borrado físico solo `admin` (la app usa baja lógica).
- `sectors`, `positions`, `contract_types`: lectura para autenticados; escritura solo `admin`.
- `profiles`: cada usuario ve los perfiles; solo `admin` administra roles.
- `audit_log`: lectura para autenticados; la escritura la hace el trigger (`security definer`), no el cliente.

Recomendaciones:
- Contraseñas gestionadas por Supabase Auth (mínimo 12 caracteres).
- Activar **MFA** para las cuentas `admin` desde Supabase.
- No cargar datos de salud en este MVP (quedan para el módulo de licencias, con tabla y RLS propias).
- Tratar los datos según la **Ley 25.326** de Protección de Datos Personales.

---

## 6. Estructura del proyecto

```
├─ src/
│  ├─ components/
│  │  ├─ employees/        formulario y ficha del empleado
│  │  ├─ Layout.tsx        navegación y barra superior
│  │  ├─ Toast.tsx         notificaciones
│  │  └─ ui.tsx            botones, inputs, modal, badges
│  ├─ lib/
│  │  ├─ data/             repo demo + repo Supabase + seed
│  │  ├─ auth.tsx          sesión, roles y login
│  │  ├─ excel.ts          plantilla, parseo, validación y export
│  │  ├─ labels.ts         etiquetas de estados y campos
│  │  ├─ queries.ts        hooks de TanStack Query
│  │  ├─ supabase.ts       cliente
│  │  ├─ types.ts          modelo de datos
│  │  └─ utils.ts          fechas, CUIL, formatos
│  ├─ pages/               Login, Panel, Empleados, Importar, Catálogos
│  ├─ App.tsx              rutas y providers
│  └─ main.tsx
├─ supabase/migrations/    esquema + seed de catálogos
├─ netlify.toml
└─ .env.example
```

---

## 7. Comandos

```bash
npm run dev        # desarrollo
npm run build      # typecheck + build de producción
npm run preview    # servir el build
npm run typecheck  # solo TypeScript
```

---

## 8. Plan free: límites y backups

| Recurso | Free tier | Nota |
|---|---|---|
| Base de datos | 500 MB | Alcanza para miles de legajos |
| Storage | 1 GB | Se usará para recibos/documentos en la próxima fase |
| Usuarios Auth | 50.000 MAU | Solo habrá 3–5 usuarios |
| Pausa por inactividad | ~7 días | Con uso diario no ocurre; se reactiva con un click |

**No hay backups automáticos en el plan free.** Antes de usarlo en producción:

1. Programá un `pg_dump` semanal (local o GitHub Actions con la cadena de conexión de **Database → Connection string**).
2. O pasá a Supabase Pro (~USD 25/mes) cuando se sumen recibos y documentos.
3. Guardá una copia de los Excel originales de importación.

Ejemplo de backup manual:

```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  --no-owner --no-privileges -f backup-confecat-$(date +%F).sql
```

---

## 9. Roadmap

| Fase | Alcance | Estado |
|---|---|---|
| 0 | Infraestructura, auth, deploy | ✅ |
| 1 | Legajo digital, Excel, catálogos, auditoría | ✅ |
| 2 | Asistencia: turnos, planilla mensual, import desde Excel, presentismo | ⏳ |
| 3 | Licencias médicas y vacaciones (con certificados y datos sensibles aislados) | ⏳ |
| 4 | Recibos de sueldo en PDF + confirmación de recepción | ⏳ |
| 5 | Portal del empleado y login por DNI | ⏳ |

Notas para las próximas fases:

- **Asistencia:** empezar digitalizando la planilla actual (carga mensual por sector). El fichaje por kiosco/tablet queda para después de estabilizar los datos.
- **Recibos:** la app distribuye y archiva; la liquidación legal sigue en el sistema del contador. La confirmación de recepción ayuda con la Ley 27.555 (recibo digital).
- **Datos de salud:** tabla separada con RLS restringida a `admin` y al propio empleado, más registro de accesos.

---

## 10. Notas legales

Este sistema es una herramienta de gestión administrativa. **No reemplaza** la liquidación de sueldos, el libro de sueldos digital ni las obligaciones del estudio contable. Antes de usarlo con datos reales, validá con tu asesor legal/contable:

- Ley 25.326 (protección de datos personales) y tratamiento de datos sensibles.
- Ley 27.555 (recibo de sueldo digital).
- Ley 20.744 (legajo del trabajador) y normativa de registro de asistencia.
- Conservación y plazo de guarda de la documentación laboral.
