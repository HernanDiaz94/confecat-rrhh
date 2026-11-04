import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  History,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  UserMinus,
  UserRound,
} from 'lucide-react'
import type { AuditChange, Employee } from '@/lib/types'
import { repo } from '@/lib/data'
import { useAuth, canManage } from '@/lib/auth'
import { useAudit, useContractTypes, usePositions, useSectors } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { Badge, Button, EmptyState, Field, Modal, Select, Spinner, Textarea } from '@/components/ui'
import {
  ACTION_LABELS,
  FIELD_LABELS,
  MOTIVO_BAJA_OPTIONS,
  STATUS_LABELS,
  STATUS_TONES,
} from '@/lib/labels'
import {
  ageFrom,
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  initials,
  seniorityLabel,
  timeAgo,
  todayIso,
} from '@/lib/utils'

function Info({
  label,
  value,
  icon,
  className,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2', className)}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-xs font-medium text-slate-800">{value || '—'}</p>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export function EmployeeDetailModal({
  employeeId,
  open,
  onClose,
  onEdit,
}: {
  employeeId: string | null
  open: boolean
  onClose: () => void
  onEdit: (employee: Employee) => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'datos' | 'historial'>('datos')
  const [bajaOpen, setBajaOpen] = useState(false)
  const [fechaEgreso, setFechaEgreso] = useState(todayIso())
  const [motivo, setMotivo] = useState(MOTIVO_BAJA_OPTIONS[0])
  const [detalle, setDetalle] = useState('')

  const employeeQuery = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => repo.getEmployee(employeeId as string),
    enabled: Boolean(employeeId),
  })
  const auditQuery = useAudit(employeeId ?? undefined)
  const sectors = useSectors().data ?? []
  const positions = usePositions().data ?? []
  const contracts = useContractTypes().data ?? []

  const employee = employeeQuery.data ?? null
  const sector = sectors.find((item) => item.id === employee?.sector_id)
  const position = positions.find((item) => item.id === employee?.position_id)
  const contract = contracts.find((item) => item.id === employee?.contract_type_id)

  const statusMutation = useMutation({
    mutationFn: (patch: {
      estado: Employee['estado']
      fecha_egreso?: string | null
      motivo_baja?: string | null
    }) => repo.setEmployeeStatus(employeeId as string, patch),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['employee', employeeId] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
      ])
      setBajaOpen(false)
      toast({
        tone: 'success',
        title:
          variables.estado === 'baja'
            ? 'Empleado dado de baja'
            : variables.estado === 'licencia'
              ? 'Licencia registrada'
              : 'Empleado reactivado',
        description: employee ? `${employee.apellido}, ${employee.nombre}` : undefined,
      })
    },
    onError: (error) => {
      toast({
        tone: 'error',
        title: 'No se pudo actualizar',
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    },
  })

  const audit = auditQuery.data ?? []

  const resolvedValue = useMemo(() => {
    return (key: string, value: unknown) => {
      if (value === null || value === undefined || value === '') return '—'
      if (key === 'sector_id') return sectors.find((item) => item.id === value)?.nombre ?? '—'
      if (key === 'position_id') return positions.find((item) => item.id === value)?.nombre ?? '—'
      if (key === 'contract_type_id') return contracts.find((item) => item.id === value)?.nombre ?? '—'
      if (key === 'estado') return STATUS_LABELS[value as Employee['estado']] ?? String(value)
      if (key === 'sueldo_basico' && typeof value === 'number') return formatCurrency(value)
      if (key.startsWith('fecha_')) return formatDate(String(value))
      if (key === 'jornada_horas') return `${value} hs`
      return String(value)
    }
  }, [sectors, positions, contracts])

  const changedEntries = (changes: Record<string, AuditChange>) =>
    Object.entries(changes).filter(([key]) => key !== 'updated_at')

  function handleClose() {
    setTab('datos')
    setBajaOpen(false)
    onClose()
  }

  const manage = canManage(user?.rol)

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        size="lg"
        title="Ficha del empleado"
        description={employee ? `Legajo ${employee.legajo}` : 'Cargando…'}
        footer={
          <>
            <Button variant="ghost" onClick={handleClose}>
              Cerrar
            </Button>
            {manage && employee && employee.estado === 'baja' && (
              <Button
                variant="success"
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ estado: 'activo' })}
              >
                <RotateCcw className="h-4 w-4" />
                Reactivar
              </Button>
            )}
            {manage && employee && employee.estado === 'activo' && (
              <Button
                variant="secondary"
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ estado: 'licencia' })}
              >
                <CalendarDays className="h-4 w-4" />
                Marcar licencia
              </Button>
            )}
            {manage && employee && employee.estado !== 'baja' && (
              <Button variant="danger" onClick={() => setBajaOpen(true)}>
                <UserMinus className="h-4 w-4" />
                Dar de baja
              </Button>
            )}
            {manage && employee && (
              <Button onClick={() => onEdit(employee)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </>
        }
      >
        {employeeQuery.isLoading && (
          <div className="grid place-items-center py-16 text-slate-400">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!employeeQuery.isLoading && !employee && (
          <EmptyState title="No encontramos el legajo" description="Puede haber sido eliminado." />
        )}

        {employee && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-900 text-lg font-bold text-amber-400">
                {initials(employee)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold leading-tight text-slate-900">
                    {employee.apellido}, {employee.nombre}
                  </h3>
                  <Badge tone={STATUS_TONES[employee.estado]}>{STATUS_LABELS[employee.estado]}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {sector?.nombre ?? 'Sin sector'}
                  {position ? ` · ${position.nombre}` : ''}
                  {' · '}Legajo {employee.legajo}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    DNI {employee.dni}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    Ingreso {formatDate(employee.fecha_ingreso)}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    {seniorityLabel(employee.fecha_ingreso)} de antigüedad
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab('datos')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  tab === 'datos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <IdCard className="h-3.5 w-3.5" />
                Datos del legajo
              </button>
              <button
                type="button"
                onClick={() => setTab('historial')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  tab === 'historial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <History className="h-3.5 w-3.5" />
                Historial {audit.length > 0 && `(${audit.length})`}
              </button>
            </div>

            {tab === 'datos' && (
              <div className="space-y-4">
                <Group title="Identificación">
                  <Info label="DNI" value={employee.dni} icon={<IdCard className="h-3 w-3" />} />
                  <Info label="CUIL" value={employee.cuil} />
                  <Info
                    label="Nacimiento"
                    value={`${formatDate(employee.fecha_nacimiento)}${ageFrom(employee.fecha_nacimiento) ? ` (${ageFrom(employee.fecha_nacimiento)} años)` : ''}`}
                  />
                  <Info label="Estado civil" value={employee.estado_civil} />
                </Group>

                <Group title="Situación laboral">
                  <Info
                    label="Ingreso"
                    value={formatDate(employee.fecha_ingreso)}
                    icon={<CalendarDays className="h-3 w-3" />}
                  />
                  <Info
                    label={employee.estado === 'baja' ? 'Egreso' : 'Antigüedad'}
                    value={
                      employee.estado === 'baja'
                        ? formatDate(employee.fecha_egreso)
                        : seniorityLabel(employee.fecha_ingreso)
                    }
                  />
                  <Info label="Sector" value={sector?.nombre} icon={<Building2 className="h-3 w-3" />} />
                  <Info label="Puesto" value={position?.nombre} icon={<Briefcase className="h-3 w-3" />} />
                  <Info label="Categoría" value={employee.categoria} />
                  <Info label="Tipo de contrato" value={contract?.nombre} />
                  <Info label="Jornada" value={employee.jornada_horas ? `${employee.jornada_horas} hs semanales` : null} />
                  <Info
                    label="Sueldo básico"
                    value={formatCurrency(employee.sueldo_basico)}
                    icon={<CircleDollarSign className="h-3 w-3" />}
                  />
                  {employee.estado === 'baja' && (
                    <Info label="Motivo de baja" value={employee.motivo_baja} className="sm:col-span-2" />
                  )}
                </Group>

                <Group title="Contacto">
                  <Info label="Teléfono" value={employee.telefono} icon={<Phone className="h-3 w-3" />} />
                  <Info label="Email" value={employee.email} icon={<Mail className="h-3 w-3" />} />
                  <Info
                    label="Domicilio"
                    value={employee.domicilio}
                    icon={<MapPin className="h-3 w-3" />}
                    className="sm:col-span-2"
                  />
                  <Info
                    label="Contacto de emergencia"
                    value={employee.contacto_emergencia_nombre}
                    icon={<UserRound className="h-3 w-3" />}
                  />
                  <Info label="Teléfono de emergencia" value={employee.contacto_emergencia_telefono} />
                </Group>

                <Group title="Datos bancarios">
                  <Info label="Banco" value={employee.banco} icon={<CreditCard className="h-3 w-3" />} />
                  <Info label="CBU" value={employee.cbu} />
                </Group>

                {employee.notas && (
                  <div>
                    <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Observaciones
                    </h4>
                    <p className="whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs leading-relaxed text-slate-700">
                      {employee.notas}
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-slate-400">
                  Última actualización: {formatDateTime(employee.updated_at)}
                </p>
              </div>
            )}

            {tab === 'historial' && (
              <div>
                {auditQuery.isLoading && (
                  <div className="grid place-items-center py-10 text-slate-400">
                    <Spinner className="h-5 w-5" />
                  </div>
                )}
                {!auditQuery.isLoading && audit.length === 0 && (
                  <EmptyState
                    icon={<History className="h-5 w-5" />}
                    title="Sin movimientos"
                    description="Los cambios de este legajo van a aparecer acá."
                  />
                )}
                <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                  {audit.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400" />
                      <div className="rounded-lg border border-slate-200 p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-800">
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </span>
                          <span className="text-[10px] text-slate-400" title={formatDateTime(entry.created_at)}>
                            {timeAgo(entry.created_at)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">por {entry.user_name}</p>
                        {changedEntries(entry.changes).length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {changedEntries(entry.changes).map(([key, change]) => (
                              <li key={key} className="text-[11px] text-slate-600">
                                <span className="font-medium text-slate-700">
                                  {FIELD_LABELS[key] ?? key}:
                                </span>{' '}
                                <span className="text-slate-400 line-through">
                                  {resolvedValue(key, change.antes)}
                                </span>{' '}
                                → <span className="font-medium">{resolvedValue(key, change.despues)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={bajaOpen}
        onClose={() => setBajaOpen(false)}
        size="sm"
        title="Dar de baja al empleado"
        description={`${employee?.apellido ?? ''}, ${employee?.nombre ?? ''} dejará de figurar como activo. El legajo se conserva.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBajaOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  estado: 'baja',
                  fecha_egreso: fechaEgreso,
                  motivo_baja: [motivo, detalle].filter(Boolean).join(': '),
                })
              }
            >
              <UserMinus className="h-4 w-4" />
              Confirmar baja
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Fecha de egreso" required>
            <input
              type="date"
              value={fechaEgreso}
              onChange={(event) => setFechaEgreso(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </Field>
          <Field label="Motivo">
            <Select value={motivo} onChange={(event) => setMotivo(event.target.value)}>
              {MOTIVO_BAJA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Detalle" hint="Opcional: aclaraciones para el legajo">
            <Textarea
              value={detalle}
              onChange={(event) => setDetalle(event.target.value)}
              placeholder="Ej.: telegrama de renuncia recibido el 12/10."
              rows={2}
            />
          </Field>
        </div>
      </Modal>
    </>
  )
}
