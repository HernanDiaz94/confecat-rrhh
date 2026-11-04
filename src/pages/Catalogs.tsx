import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Building2, FileText, Lock, Pencil, Plus, Power } from 'lucide-react'
import type { ContractType, Position, Sector } from '@/lib/types'
import { repo } from '@/lib/data'
import { useAuth, canAdmin } from '@/lib/auth'
import { useAllEmployees, useContractTypes, usePositions, useSectors } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'

type Tab = 'sectores' | 'puestos' | 'contratos'

type ModalState =
  | { type: 'sector'; item?: Sector }
  | { type: 'position'; item?: Position }
  | { type: 'contract'; item?: ContractType }
  | null

export function CatalogsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('sectores')
  const [modal, setModal] = useState<ModalState>(null)
  const [nombre, setNombre] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')

  const sectorsQuery = useSectors()
  const positionsQuery = usePositions()
  const contractsQuery = useContractTypes()
  const employeesQuery = useAllEmployees()

  const sectors = sectorsQuery.data ?? []
  const positions = positionsQuery.data ?? []
  const contracts = contractsQuery.data ?? []
  const employees = employeesQuery.data ?? []
  const canEdit = canAdmin(user?.rol)

  useEffect(() => {
    if (!modal) return
    if (modal.type === 'position') {
      setNombre(modal.item?.nombre ?? '')
      setSectorId(modal.item?.sector_id ?? sectors[0]?.id ?? '')
    } else {
      setNombre(modal.item?.nombre ?? '')
    }
  }, [modal, sectors])

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sectors'] }),
      queryClient.invalidateQueries({ queryKey: ['positions'] }),
      queryClient.invalidateQueries({ queryKey: ['contract-types'] }),
      queryClient.invalidateQueries({ queryKey: ['employees'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!modal) return
      if (!nombre.trim()) throw new Error('El nombre es obligatorio.')
      if (modal.type === 'sector') {
        return repo.saveSector({ id: modal.item?.id, nombre, activo: modal.item?.activo ?? true })
      }
      if (modal.type === 'position') {
        if (!sectorId) throw new Error('Elegí un sector para el puesto.')
        return repo.savePosition({
          id: modal.item?.id,
          nombre,
          sector_id: sectorId,
          activo: modal.item?.activo ?? true,
        })
      }
      return repo.saveContractType({
        id: modal.item?.id,
        nombre,
        activo: modal.item?.activo ?? true,
      })
    },
    onSuccess: async () => {
      await invalidateAll()
      toast({ tone: 'success', title: 'Catálogo actualizado', description: nombre.trim() })
      setModal(null)
    },
    onError: (error) => {
      toast({
        tone: 'error',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (input: { type: Tab; item: Sector | Position | ContractType }) => {
      if (input.type === 'sectores') {
        const sector = input.item as Sector
        return repo.saveSector({ id: sector.id, nombre: sector.nombre, activo: !sector.activo })
      }
      if (input.type === 'puestos') {
        const position = input.item as Position
        return repo.savePosition({
          id: position.id,
          nombre: position.nombre,
          sector_id: position.sector_id,
          activo: !position.activo,
        })
      }
      const contract = input.item as ContractType
      return repo.saveContractType({
        id: contract.id,
        nombre: contract.nombre,
        activo: !contract.activo,
      })
    },
    onSuccess: async () => {
      await invalidateAll()
      toast({ tone: 'success', title: 'Estado actualizado' })
    },
    onError: (error) => {
      toast({
        tone: 'error',
        title: 'No se pudo actualizar',
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    },
  })

  const sectorById = new Map(sectors.map((sector) => [sector.id, sector.nombre]))
  const activeEmployeesBySector = new Map<string, number>()
  employees.forEach((employee) => {
    if (employee.estado !== 'baja' && employee.sector_id) {
      activeEmployeesBySector.set(
        employee.sector_id,
        (activeEmployeesBySector.get(employee.sector_id) ?? 0) + 1,
      )
    }
  })

  const filteredPositions = sectorFilter
    ? positions.filter((position) => position.sector_id === sectorFilter)
    : positions

  const loading = sectorsQuery.isLoading || positionsQuery.isLoading || contractsQuery.isLoading

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catálogos"
        description="Sectores, puestos y tipos de contrato que se usan en los legajos y en la importación."
        actions={
          canEdit ? (
            <Button
              onClick={() => {
                setModal({ type: tab === 'sectores' ? 'sector' : tab === 'puestos' ? 'position' : 'contract' })
              }}
            >
              <Plus className="h-4 w-4" />
              {tab === 'sectores' ? 'Nuevo sector' : tab === 'puestos' ? 'Nuevo puesto' : 'Nuevo tipo'}
            </Button>
          ) : (
            <Badge tone="slate">
              <Lock className="h-3 w-3" />
              Solo lectura
            </Badge>
          )
        }
      />

      {!canEdit && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Solo los administradores pueden modificar los catálogos. Si necesitás un sector o puesto
            nuevo, contactá a administración.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {[
          { key: 'sectores' as const, label: 'Sectores', count: sectors.length, icon: Building2 },
          { key: 'puestos' as const, label: 'Puestos', count: positions.length, icon: Briefcase },
          { key: 'contratos' as const, label: 'Tipos de contrato', count: contracts.length, icon: FileText },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setTab(option.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
              tab === option.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <option.icon className="h-3.5 w-3.5" />
            {option.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px]',
                tab === option.key ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500',
              )}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-20 text-slate-400">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <Card>
          {tab === 'sectores' && (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Sector</th>
                  <th className="px-4 py-2.5">Planta activa</th>
                  <th className="px-4 py-2.5">Puestos</th>
                  <th className="px-4 py-2.5">Estado</th>
                  {canEdit && <th className="px-4 py-2.5 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sectors.map((sector) => {
                  const positionCount = positions.filter(
                    (position) => position.sector_id === sector.id,
                  ).length
                  return (
                    <tr key={sector.id} className="bg-white">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{sector.nombre}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">
                        {activeEmployeesBySector.get(sector.id) ?? 0}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">{positionCount}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={sector.activo ? 'green' : 'slate'}>
                          {sector.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => setModal({ type: 'sector', item: sector })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={sector.activo ? 'Desactivar' : 'Activar'}
                              onClick={() => toggleMutation.mutate({ type: 'sectores', item: sector })}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {sectors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">
                      No hay sectores cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'puestos' && (
            <>
              <div className="border-b border-slate-200 p-3">
                <Select
                  value={sectorFilter}
                  onChange={(event) => setSectorFilter(event.target.value)}
                  className="max-w-xs"
                  aria-label="Filtrar puestos por sector"
                >
                  <option value="">Todos los sectores</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Puesto</th>
                    <th className="px-4 py-2.5">Sector</th>
                    <th className="px-4 py-2.5">Estado</th>
                    {canEdit && <th className="px-4 py-2.5 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPositions.map((position) => (
                    <tr key={position.id} className="bg-white">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{position.nombre}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {sectorById.get(position.sector_id) ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={position.activo ? 'green' : 'slate'}>
                          {position.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => setModal({ type: 'position', item: position })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={position.activo ? 'Desactivar' : 'Activar'}
                              onClick={() => toggleMutation.mutate({ type: 'puestos', item: position })}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredPositions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-xs text-slate-400">
                        No hay puestos para este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {tab === 'contratos' && (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Tipo de contrato</th>
                  <th className="px-4 py-2.5">Legajos</th>
                  <th className="px-4 py-2.5">Estado</th>
                  {canEdit && <th className="px-4 py-2.5 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="bg-white">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{contract.nombre}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">
                      {employees.filter((employee) => employee.contract_type_id === contract.id).length}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={contract.activo ? 'green' : 'slate'}>
                        {contract.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => setModal({ type: 'contract', item: contract })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={contract.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => toggleMutation.mutate({ type: 'contratos', item: contract })}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-xs text-slate-400">
                      No hay tipos de contrato cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <p className="text-[10px] text-slate-400">
        Los catálogos no se eliminan: se desactivan para no romper legajos históricos. Total de
        legajos: {formatNumber(employees.length)}.
      </p>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size="sm"
        title={
          modal?.type === 'sector'
            ? modal.item
              ? 'Editar sector'
              : 'Nuevo sector'
            : modal?.type === 'position'
              ? modal.item
                ? 'Editar puesto'
                : 'Nuevo puesto'
              : modal?.item
                ? 'Editar tipo de contrato'
                : 'Nuevo tipo de contrato'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {modal?.type === 'position' && (
            <Field label="Sector" required>
              <Select value={sectorId} onChange={(event) => setSectorId(event.target.value)}>
                <option value="">Elegí un sector</option>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Nombre" required hint="Se puede cambiar más adelante sin afectar los legajos.">
            <Input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder={
                modal?.type === 'sector'
                  ? 'Ej.: Logística'
                  : modal?.type === 'position'
                    ? 'Ej.: Operario de despacho'
                    : 'Ej.: Contrato de temporada'
              }
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveMutation.mutate()
              }}
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
