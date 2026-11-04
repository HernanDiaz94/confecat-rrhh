import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Plus,
  Search,
  Upload,
  Users,
  X,
} from 'lucide-react'
import type { Employee, EmployeeStatus } from '@/lib/types'
import { repo } from '@/lib/data'
import { useAuth, canManage } from '@/lib/auth'
import { useContractTypes, usePositions, useSectors } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from '@/components/ui'
import { EmployeeFormModal } from '@/components/employees/EmployeeForm'
import { EmployeeDetailModal } from '@/components/employees/EmployeeDetail'
import { STATUS_LABELS, STATUS_TONES } from '@/lib/labels'
import { exportEmployeesToExcel } from '@/lib/excel'
import { cn, formatDate, formatNumber, initials, seniorityLabel } from '@/lib/utils'

const PAGE_SIZE = 10

export function EmployeesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [sectorId, setSectorId] = useState('')
  const [estado, setEstado] = useState<EmployeeStatus | 'todos'>('todos')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [exporting, setExporting] = useState(false)

  const sectors = useSectors().data ?? []
  const positions = usePositions().data ?? []
  const contracts = useContractTypes().data ?? []

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    if (searchParams.get('nuevo') === '1' && canManage(user?.rol)) {
      setEditing(null)
      setFormOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, user?.rol])

  const listQuery = useQuery({
    queryKey: ['employees', 'list', { search, sectorId, estado, page }],
    queryFn: () =>
      repo.listEmployees({
        search,
        sectorId: sectorId || undefined,
        estado,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const rows = listQuery.data?.rows ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filtersActive = search !== '' || sectorId !== '' || estado !== 'todos'

  const positionName = useMemo(() => {
    const map = new Map(positions.map((position) => [position.id, position.nombre]))
    return (id: string | null) => (id ? map.get(id) : undefined)
  }, [positions])

  const sectorName = useMemo(() => {
    const map = new Map(sectors.map((sector) => [sector.id, sector.nombre]))
    return (id: string | null) => (id ? map.get(id) : undefined)
  }, [sectors])

  async function handleExport() {
    setExporting(true)
    try {
      const all = await repo.listAllEmployees()
      exportEmployeesToExcel(all, { sectors, positions, contractTypes: contracts })
      toast({
        tone: 'success',
        title: 'Listado exportado',
        description: `${formatNumber(all.length)} legajos en el archivo Excel.`,
      })
    } catch (error) {
      toast({
        tone: 'error',
        title: 'No se pudo exportar',
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    } finally {
      setExporting(false)
    }
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setSectorId('')
    setEstado('todos')
    setPage(1)
  }

  const manage = canManage(user?.rol)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Empleados"
        description="Legajo digital de la planta. Buscá por nombre, DNI, CUIL o legajo."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} loading={exporting}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            {manage && (
              <Link to="/importar">
                <Button variant="secondary">
                  <Upload className="h-4 w-4" />
                  Importar
                </Button>
              </Link>
            )}
            {manage && (
              <Button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Nuevo empleado
              </Button>
            )}
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-2 border-b border-slate-200 p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por apellido, nombre, DNI, CUIL o legajo…"
              className="pl-9"
              aria-label="Buscar empleados"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={sectorId}
              onChange={(event) => {
                setSectorId(event.target.value)
                setPage(1)
              }}
              className="w-full sm:w-44"
              aria-label="Filtrar por sector"
            >
              <option value="">Todos los sectores</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.nombre}
                </option>
              ))}
            </Select>
            <Select
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value as EmployeeStatus | 'todos')
                setPage(1)
              }}
              className="w-full sm:w-36"
              aria-label="Filtrar por estado"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="licencia">En licencia</option>
              <option value="baja">Bajas</option>
            </Select>
            {filtersActive && (
              <Button variant="ghost" onClick={clearFilters} size="md">
                <X className="h-3.5 w-3.5" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-500">
          <span>
            {listQuery.isFetching && !listQuery.isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="h-3 w-3" /> Actualizando…
              </span>
            ) : (
              <>
                <b className="font-semibold text-slate-700">{formatNumber(total)}</b>{' '}
                {total === 1 ? 'legajo' : 'legajos'}
                {filtersActive ? ' con los filtros aplicados' : ' en total'}
              </>
            )}
          </span>
          {totalPages > 1 && (
            <span>
              Página {page} de {totalPages}
            </span>
          )}
        </div>

        {listQuery.isLoading ? (
          <div className="grid place-items-center py-20 text-slate-400">
            <Spinner className="h-6 w-6" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={filtersActive ? 'Sin resultados' : 'Todavía no hay empleados'}
            description={
              filtersActive
                ? 'Probá con otro término de búsqueda o quitá los filtros.'
                : 'Cargá el primer legajo o importá el listado completo desde Excel.'
            }
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Quitar filtros
                </Button>
              ) : manage ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setFormOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo empleado
                  </Button>
                  <Link to="/importar">
                    <Button size="sm" variant="secondary">
                      <Upload className="h-3.5 w-3.5" />
                      Importar Excel
                    </Button>
                  </Link>
                </div>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Tabla (desktop) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Empleado</th>
                    <th className="px-4 py-2.5">Legajo / DNI</th>
                    <th className="px-4 py-2.5">Sector / Puesto</th>
                    <th className="px-4 py-2.5">Ingreso</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((employee) => (
                    <tr
                      key={employee.id}
                      onClick={() => setSelectedId(employee.id)}
                      className="cursor-pointer bg-white text-xs transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                              employee.estado === 'baja'
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-amber-50 text-amber-700',
                            )}
                          >
                            {initials(employee)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {employee.apellido}, {employee.nombre}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {employee.email ?? employee.cuil}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium tabular-nums text-slate-700">{employee.legajo}</p>
                        <p className="text-[11px] tabular-nums text-slate-400">{employee.dni}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-slate-700">{sectorName(employee.sector_id) ?? '—'}</p>
                        <p className="text-[11px] text-slate-400">
                          {positionName(employee.position_id) ?? 'Sin puesto'}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-slate-700">{formatDate(employee.fecha_ingreso)}</p>
                        <p className="text-[11px] text-slate-400">
                          {seniorityLabel(employee.fecha_ingreso)}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={STATUS_TONES[employee.estado]}>
                          {STATUS_LABELS[employee.estado]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400">
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (mobile) */}
            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => setSelectedId(employee.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-50 text-[11px] font-bold text-amber-700">
                    {initials(employee)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {employee.apellido}, {employee.nombre}
                      </p>
                      <Badge tone={STATUS_TONES[employee.estado]}>
                        {STATUS_LABELS[employee.estado]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Legajo {employee.legajo} · DNI {employee.dni}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {sectorName(employee.sector_id) ?? 'Sin sector'} · Ingreso{' '}
                      {formatDate(employee.fecha_ingreso)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
                <span className="text-[11px] text-slate-400">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de{' '}
                  {formatNumber(total)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <p className="text-[10px] text-slate-400">
        Los legajos dados de baja no se eliminan: se conservan para trazabilidad y auditoría.
      </p>

      <EmployeeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        employee={editing}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['employees'] })
          queryClient.invalidateQueries({ queryKey: ['audit'] })
        }}
      />

      <EmployeeDetailModal
        employeeId={selectedId}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        onEdit={(employee) => {
          setSelectedId(null)
          setEditing(employee)
          setFormOpen(true)
        }}
      />
    </div>
  )
}
