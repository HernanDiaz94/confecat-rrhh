import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CakeSlice,
  CalendarDays,
  Download,
  FileSpreadsheet,
  History,
  Plus,
  UserMinus,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { useAllEmployees, useAudit, useContractTypes, usePositions, useSectors } from '@/lib/queries'
import { useAuth, canManage } from '@/lib/auth'
import { ACTION_LABELS, FIELD_LABELS } from '@/lib/labels'
import { downloadImportTemplate } from '@/lib/excel'
import {
  ageFrom,
  formatNumber,
  isBirthdayInMonth,
  isSameMonth,
  timeAgo,
} from '@/lib/utils'
import { cn } from '@/lib/utils'

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string | number
  hint: string
  icon: React.ReactNode
  tone: 'slate' | 'emerald' | 'amber' | 'sky'
}) {
  const tones = {
    slate: 'bg-slate-900 text-amber-400',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
        </div>
        <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tones[tone])}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const { user, mode } = useAuth()
  const employeesQuery = useAllEmployees()
  const sectorsQuery = useSectors()
  const positionsQuery = usePositions()
  const contractsQuery = useContractTypes()
  const auditQuery = useAudit()

  const employees = employeesQuery.data ?? []
  const sectors = sectorsQuery.data ?? []
  const positions = positionsQuery.data ?? []

  const stats = useMemo(() => {
    const active = employees.filter((employee) => employee.estado !== 'baja')
    const ingresos = employees.filter((employee) => isSameMonth(employee.fecha_ingreso))
    const egresos = employees.filter(
      (employee) => employee.fecha_egreso && isSameMonth(employee.fecha_egreso),
    )
    const licencias = employees.filter((employee) => employee.estado === 'licencia')
    const birthdays = employees
      .filter((employee) => isBirthdayInMonth(employee.fecha_nacimiento) && employee.estado !== 'baja')
      .sort((a, b) => (a.fecha_nacimiento ?? '').slice(8, 10).localeCompare((b.fecha_nacimiento ?? '').slice(8, 10)))
    const averageSeniority =
      active.length > 0
        ? active.reduce((acc, employee) => {
            const years = (Date.now() - new Date(employee.fecha_ingreso).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            return acc + Math.max(0, years)
          }, 0) / active.length
        : 0

    return { active, ingresos, egresos, licencias, birthdays, averageSeniority }
  }, [employees])

  const bySector = useMemo(() => {
    const rows = sectors.map((sector) => ({
      id: sector.id,
      nombre: sector.nombre,
      total: employees.filter(
        (employee) => employee.sector_id === sector.id && employee.estado !== 'baja',
      ).length,
    }))
    const sinSector = employees.filter(
      (employee) => !employee.sector_id && employee.estado !== 'baja',
    ).length
    if (sinSector > 0) rows.push({ id: 'none', nombre: 'Sin sector', total: sinSector })
    return rows.sort((a, b) => b.total - a.total)
  }, [sectors, employees])

  const maxSector = Math.max(1, ...bySector.map((row) => row.total))

  const audit = auditQuery.data ?? []
  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach((employee) => map.set(employee.id, `${employee.apellido}, ${employee.nombre}`))
    return map
  }, [employees])

  if (employeesQuery.isLoading) {
    return (
      <div className="grid place-items-center py-24 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${user?.nombre.split(' ')[0] ?? ''}`}
        description="Resumen de la dotación y los últimos movimientos del legajo."
        actions={
          canManage(user?.rol) ? (
            <>
              <Button variant="secondary" onClick={downloadImportTemplate}>
                <Download className="h-4 w-4" />
                Plantilla Excel
              </Button>
              <Link to="/empleados?nuevo=1">
                <Button>
                  <Plus className="h-4 w-4" />
                  Nuevo empleado
                </Button>
              </Link>
            </>
          ) : (
            <Badge tone="slate">Acceso de solo lectura</Badge>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Dotación activa"
          value={formatNumber(stats.active.length)}
          hint={`${formatNumber(employees.length)} legajos en total`}
          icon={<Users className="h-4.5 w-4.5" />}
          tone="slate"
        />
        <StatCard
          label="Ingresos del mes"
          value={formatNumber(stats.ingresos.length)}
          hint={`${formatNumber(employees.filter((employee) => employee.fecha_ingreso.slice(0, 4) === String(new Date().getFullYear())).length)} en ${new Date().getFullYear()}`}
          icon={<UserRoundCheck className="h-4.5 w-4.5" />}
          tone="emerald"
        />
        <StatCard
          label="Egresos del mes"
          value={formatNumber(stats.egresos.length)}
          hint={`${formatNumber(employees.filter((employee) => employee.estado === 'baja').length)} bajas históricas`}
          icon={<UserMinus className="h-4.5 w-4.5" />}
          tone="amber"
        />
        <StatCard
          label="Antigüedad promedio"
          value={`${stats.averageSeniority.toFixed(1)} años`}
          hint={`${formatNumber(stats.licencias.length)} ${stats.licencias.length === 1 ? 'persona' : 'personas'} en licencia`}
          icon={<CalendarDays className="h-4.5 w-4.5" />}
          tone="sky"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Dotación por sector</h2>
              <p className="text-[11px] text-slate-500">Personal activo y en licencia</p>
            </div>
            <Link to="/empleados" className="text-[11px] font-semibold text-slate-500 hover:text-slate-900">
              Ver listado
            </Link>
          </div>
          <div className="space-y-3 p-4">
            {bySector.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">Todavía no hay sectores cargados.</p>
            )}
            {bySector.map((row) => (
              <div key={row.id} className="grid grid-cols-[110px_1fr_36px] items-center gap-3">
                <span className="truncate text-xs font-medium text-slate-600" title={row.nombre}>
                  {row.nombre}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      row.id === 'none' ? 'bg-slate-300' : 'bg-slate-800',
                    )}
                    style={{ width: `${Math.max(3, (row.total / maxSector) * 100)}%` }}
                  />
                </div>
                <span className="text-right text-xs font-semibold tabular-nums text-slate-700">
                  {row.total}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <CakeSlice className="h-4 w-4 text-amber-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Cumpleaños del mes</h2>
              <p className="text-[11px] text-slate-500">
                {stats.birthdays.length === 0
                  ? 'Sin cumpleaños este mes'
                  : `${stats.birthdays.length} en ${new Date().toLocaleDateString('es-AR', { month: 'long' })}`}
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.birthdays.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-slate-400">
                No hay cumpleaños cargados para este mes.
              </p>
            )}
            {stats.birthdays.slice(0, 6).map((employee) => (
              <div key={employee.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-50 text-[11px] font-bold text-amber-700">
                  {employee.fecha_nacimiento?.slice(8, 10)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {employee.apellido}, {employee.nombre}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {ageFrom(employee.fecha_nacimiento)} años ·{' '}
                    {positions.find((position) => position.id === employee.position_id)?.nombre ??
                      'Sin puesto'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <History className="h-4 w-4 text-slate-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Últimos movimientos</h2>
              <p className="text-[11px] text-slate-500">Auditoría de altas, bajas y modificaciones</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {audit.length === 0 && (
              <EmptyState
                icon={<History className="h-5 w-5" />}
                title="Sin movimientos todavía"
                description="Cuando se cree o modifique un legajo, el cambio va a quedar registrado acá."
              />
            )}
            {audit.slice(0, 8).map((entry) => {
              const changed = Object.keys(entry.changes).filter((key) => key !== 'updated_at')
              return (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className={cn(
                      'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                      entry.action === 'crear' && 'bg-emerald-50 text-emerald-600',
                      entry.action === 'actualizar' && 'bg-sky-50 text-sky-600',
                      entry.action === 'baja' && 'bg-rose-50 text-rose-600',
                      entry.action === 'reactivar' && 'bg-amber-50 text-amber-600',
                    )}
                  >
                    {entry.action === 'crear' && <ArrowUpRight className="h-3.5 w-3.5" />}
                    {entry.action === 'actualizar' && <History className="h-3.5 w-3.5" />}
                    {entry.action === 'baja' && <ArrowDownRight className="h-3.5 w-3.5" />}
                    {entry.action === 'reactivar' && <UserRoundCheck className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-semibold text-slate-800">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                      <span className="truncate text-xs text-slate-500">
                        {nameById.get(entry.entity_id) ?? 'Legajo'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {entry.user_name} · {timeAgo(entry.created_at)}
                      {changed.length > 0 && (
                        <span className="ml-1">
                          · {changed.length} {changed.length === 1 ? 'campo' : 'campos'} (
                          {changed.slice(0, 2).map((key) => FIELD_LABELS[key] ?? key).join(', ')}
                          {changed.length > 2 ? '…' : ''})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Accesos rápidos</h2>
          <p className="text-[11px] text-slate-500">Tareas habituales de administración</p>
          <div className="mt-3 space-y-2">
            {canManage(user?.rol) && (
              <Link
                to="/empleados?nuevo=1"
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-slate-400" />
                  Cargar un empleado
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            )}
            {canManage(user?.rol) && (
              <Link
                to="/importar"
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                  Importar desde Excel
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            )}
            <button
              type="button"
              onClick={downloadImportTemplate}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4 text-slate-400" />
                Descargar plantilla
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <Link
              to="/catalogos"
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                Revisar catálogos
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-600">Antigüedad promedio</p>
            <p className="text-[11px] text-slate-400">
              {stats.active.length > 0
                ? `${stats.averageSeniority.toFixed(1)} años · ${formatNumber(stats.active.length)} personas`
                : 'Sin datos'}
            </p>
          </div>

          {mode === 'demo' && (
            <p className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-2.5 text-[10px] leading-relaxed text-amber-800">
              Estás en modo demo: los datos se guardan en este navegador. Conectá Supabase para
              usarlo en producción (ver README).
            </p>
          )}
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Siguiente paso del plan</h2>
          <p className="text-[11px] text-slate-500">
            Asistencia, licencias y recibos se suman sobre esta misma base de legajos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectors.length > 0 && (
            <Badge tone="slate">{sectors.length} sectores</Badge>
          )}
          {positions.length > 0 && (
            <Badge tone="slate">{positions.length} puestos</Badge>
          )}
          {(contractsQuery.data?.length ?? 0) > 0 && (
            <Badge tone="slate">{contractsQuery.data?.length} tipos de contrato</Badge>
          )}
        </div>
      </Card>
    </div>
  )
}
