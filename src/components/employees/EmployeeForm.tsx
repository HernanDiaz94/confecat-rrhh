import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Wand2 } from 'lucide-react'
import type { Employee, EmployeeInput } from '@/lib/types'
import { repo } from '@/lib/data'
import { useContractTypes, usePositions, useSectors } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { ESTADO_CIVIL_OPTIONS, STATUS_LABELS } from '@/lib/labels'
import {
  buildCuil,
  isValidCuil,
  isValidDni,
  onlyDigits,
  parseNumber,
  todayIso,
} from '@/lib/utils'

interface FormState {
  legajo: string
  dni: string
  cuil: string
  apellido: string
  nombre: string
  fecha_nacimiento: string
  estado_civil: string
  domicilio: string
  telefono: string
  email: string
  contacto_emergencia_nombre: string
  contacto_emergencia_telefono: string
  fecha_ingreso: string
  sector_id: string
  position_id: string
  categoria: string
  contract_type_id: string
  jornada_horas: string
  sueldo_basico: string
  banco: string
  cbu: string
  notas: string
}

function emptyForm(): FormState {
  return {
    legajo: '',
    dni: '',
    cuil: '',
    apellido: '',
    nombre: '',
    fecha_nacimiento: '',
    estado_civil: '',
    domicilio: '',
    telefono: '',
    email: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    fecha_ingreso: todayIso(),
    sector_id: '',
    position_id: '',
    categoria: '',
    contract_type_id: '',
    jornada_horas: '45',
    sueldo_basico: '',
    banco: '',
    cbu: '',
    notas: '',
  }
}

function fromEmployee(employee: Employee): FormState {
  return {
    legajo: employee.legajo,
    dni: employee.dni,
    cuil: employee.cuil,
    apellido: employee.apellido,
    nombre: employee.nombre,
    fecha_nacimiento: employee.fecha_nacimiento ?? '',
    estado_civil: employee.estado_civil ?? '',
    domicilio: employee.domicilio ?? '',
    telefono: employee.telefono ?? '',
    email: employee.email ?? '',
    contacto_emergencia_nombre: employee.contacto_emergencia_nombre ?? '',
    contacto_emergencia_telefono: employee.contacto_emergencia_telefono ?? '',
    fecha_ingreso: employee.fecha_ingreso,
    sector_id: employee.sector_id ?? '',
    position_id: employee.position_id ?? '',
    categoria: employee.categoria ?? '',
    contract_type_id: employee.contract_type_id ?? '',
    jornada_horas: employee.jornada_horas === null ? '' : String(employee.jornada_horas),
    sueldo_basico: employee.sueldo_basico === null ? '' : String(employee.sueldo_basico),
    banco: employee.banco ?? '',
    cbu: employee.cbu ?? '',
    notas: employee.notas ?? '',
  }
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="col-span-full mb-0.5 mt-1 flex items-center gap-3 first:mt-0">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

export function EmployeeFormModal({
  open,
  onClose,
  employee,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  employee?: Employee | null
  onSaved?: (employee: Employee) => void
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const sectorsQuery = useSectors()
  const positionsQuery = usePositions()
  const contractsQuery = useContractTypes()

  useEffect(() => {
    if (!open) return
    setForm(employee ? fromEmployee(employee) : emptyForm())
    setErrors({})
  }, [open, employee])

  const sectors = sectorsQuery.data ?? []
  const positions = positionsQuery.data ?? []
  const contracts = contractsQuery.data ?? []

  const availablePositions = useMemo(
    () =>
      positions.filter(
        (position) =>
          !form.sector_id || position.sector_id === form.sector_id,
      ),
    [positions, form.sector_id],
  )

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'sector_id') {
        const stillValid = positions.some(
          (position) => position.id === current.position_id && position.sector_id === value,
        )
        if (!stillValid) next.position_id = ''
      }
      return next
    })
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: (input: EmployeeInput) =>
      employee ? repo.updateEmployee(employee.id, input) : repo.createEmployee(input),
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
      ])
      toast({
        tone: 'success',
        title: employee ? 'Legajo actualizado' : 'Empleado creado',
        description: `${saved.apellido}, ${saved.nombre} · legajo ${saved.legajo}`,
      })
      onSaved?.(saved)
      onClose()
    },
    onError: (error) => {
      toast({
        tone: 'error',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    },
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!form.legajo.trim()) nextErrors.legajo = 'Obligatorio'
    if (!form.apellido.trim()) nextErrors.apellido = 'Obligatorio'
    if (!form.nombre.trim()) nextErrors.nombre = 'Obligatorio'
    if (!isValidDni(form.dni)) nextErrors.dni = 'Ingresá 7 u 8 dígitos'
    if (!form.fecha_ingreso) nextErrors.fecha_ingreso = 'Obligatorio'

    const cuil = form.cuil ? onlyDigits(form.cuil) : isValidDni(form.dni) ? buildCuil('20', form.dni) : ''
    if (form.cuil && !isValidCuil(cuil)) nextErrors.cuil = 'CUIL inválido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Email inválido'
    if (form.cbu && onlyDigits(form.cbu).length !== 22) nextErrors.cbu = 'El CBU tiene 22 dígitos'
    if (form.sueldo_basico && (parseNumber(form.sueldo_basico) ?? -1) < 0) {
      nextErrors.sueldo_basico = 'Valor inválido'
    }
    if (form.fecha_nacimiento && form.fecha_nacimiento > todayIso()) {
      nextErrors.fecha_nacimiento = 'La fecha no puede ser futura'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast({ tone: 'error', title: 'Revisá los datos marcados' })
      return
    }

    const input: EmployeeInput = {
      legajo: form.legajo.trim(),
      dni: onlyDigits(form.dni),
      cuil,
      apellido: form.apellido.trim(),
      nombre: form.nombre.trim(),
      fecha_nacimiento: form.fecha_nacimiento || null,
      estado_civil: form.estado_civil || null,
      domicilio: form.domicilio.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      contacto_emergencia_nombre: form.contacto_emergencia_nombre.trim() || null,
      contacto_emergencia_telefono: form.contacto_emergencia_telefono.trim() || null,
      fecha_ingreso: form.fecha_ingreso,
      fecha_egreso: employee?.fecha_egreso ?? null,
      sector_id: form.sector_id || null,
      position_id: form.position_id || null,
      categoria: form.categoria.trim() || null,
      contract_type_id: form.contract_type_id || null,
      jornada_horas: parseNumber(form.jornada_horas),
      sueldo_basico: parseNumber(form.sueldo_basico),
      banco: form.banco.trim() || null,
      cbu: form.cbu ? onlyDigits(form.cbu) : null,
      estado: employee?.estado ?? 'activo',
      motivo_baja: employee?.motivo_baja ?? null,
      notas: form.notas.trim() || null,
    }

    mutation.mutate(input)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={employee ? 'Editar legajo' : 'Nuevo empleado'}
      description={
        employee
          ? `${employee.apellido}, ${employee.nombre} · ${STATUS_LABELS[employee.estado]}`
          : 'Completá los datos mínimos. El legajo y el DNI no se pueden repetir.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending} type="submit" form="employee-form">
            <Save className="h-4 w-4" />
            {employee ? 'Guardar cambios' : 'Crear empleado'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <SectionTitle title="Identificación" />
        <Field label="Legajo" required error={errors.legajo}>
          <Input
            value={form.legajo}
            onChange={(event) => update('legajo', event.target.value)}
            placeholder="101"
            inputMode="numeric"
          />
        </Field>
        <Field label="DNI" required error={errors.dni} hint="Sin puntos ni espacios">
          <Input
            value={form.dni}
            onChange={(event) => update('dni', event.target.value)}
            placeholder="30123456"
            inputMode="numeric"
          />
        </Field>
        <Field label="CUIL" error={errors.cuil} hint="Si lo dejás vacío se genera automáticamente">
          <div className="flex gap-1.5">
            <Input
              value={form.cuil}
              onChange={(event) => update('cuil', event.target.value)}
              placeholder="20301234563"
              inputMode="numeric"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              title="Generar CUIL desde el DNI"
              onClick={() => {
                if (!isValidDni(form.dni)) {
                  setErrors((current) => ({ ...current, dni: 'Ingresá 7 u 8 dígitos' }))
                  return
                }
                update('cuil', buildCuil('20', form.dni))
              }}
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
        </Field>
        <Field label="Apellido" required error={errors.apellido}>
          <Input
            value={form.apellido}
            onChange={(event) => update('apellido', event.target.value)}
            placeholder="Pérez"
          />
        </Field>
        <Field label="Nombre" required error={errors.nombre}>
          <Input
            value={form.nombre}
            onChange={(event) => update('nombre', event.target.value)}
            placeholder="Juan"
          />
        </Field>
        <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento}>
          <Input
            type="date"
            max={todayIso()}
            value={form.fecha_nacimiento}
            onChange={(event) => update('fecha_nacimiento', event.target.value)}
          />
        </Field>
        <Field label="Estado civil">
          <Select
            value={form.estado_civil}
            onChange={(event) => update('estado_civil', event.target.value)}
          >
            <option value="">Sin especificar</option>
            {ESTADO_CIVIL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>

        <SectionTitle title="Datos laborales" />
        <Field label="Fecha de ingreso" required error={errors.fecha_ingreso}>
          <Input
            type="date"
            value={form.fecha_ingreso}
            onChange={(event) => update('fecha_ingreso', event.target.value)}
          />
        </Field>
        <Field label="Sector">
          <Select value={form.sector_id} onChange={(event) => update('sector_id', event.target.value)}>
            <option value="">Sin asignar</option>
            {sectors
              .filter((sector) => sector.activo || sector.id === form.sector_id)
              .map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.nombre}
                  {!sector.activo ? ' (inactivo)' : ''}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Puesto" hint={form.sector_id ? undefined : 'Elegí primero el sector'}>
          <Select
            value={form.position_id}
            onChange={(event) => update('position_id', event.target.value)}
            disabled={!form.sector_id}
          >
            <option value="">Sin asignar</option>
            {availablePositions
              .filter((position) => position.activo || position.id === form.position_id)
              .map((position) => (
                <option key={position.id} value={position.id}>
                  {position.nombre}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Categoría" hint="Según convenio">
          <Input
            value={form.categoria}
            onChange={(event) => update('categoria', event.target.value)}
            placeholder="Oficial"
          />
        </Field>
        <Field label="Tipo de contrato">
          <Select
            value={form.contract_type_id}
            onChange={(event) => update('contract_type_id', event.target.value)}
          >
            <option value="">Sin asignar</option>
            {contracts
              .filter((contract) => contract.activo || contract.id === form.contract_type_id)
              .map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.nombre}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Jornada semanal (horas)">
          <Input
            value={form.jornada_horas}
            onChange={(event) => update('jornada_horas', event.target.value)}
            placeholder="45"
            inputMode="numeric"
          />
        </Field>
        <Field label="Sueldo básico" error={errors.sueldo_basico} hint="Valor bruto en pesos">
          <Input
            value={form.sueldo_basico}
            onChange={(event) => update('sueldo_basico', event.target.value)}
            placeholder="950000"
            inputMode="numeric"
          />
        </Field>

        <SectionTitle title="Contacto y datos bancarios" />
        <Field label="Teléfono">
          <Input
            value={form.telefono}
            onChange={(event) => update('telefono', event.target.value)}
            placeholder="11-5555-1234"
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="nombre@correo.com"
          />
        </Field>
        <Field label="Domicilio" className="sm:col-span-2 lg:col-span-1">
          <Input
            value={form.domicilio}
            onChange={(event) => update('domicilio', event.target.value)}
            placeholder="Calle, número, localidad"
          />
        </Field>
        <Field label="Contacto de emergencia">
          <Input
            value={form.contacto_emergencia_nombre}
            onChange={(event) => update('contacto_emergencia_nombre', event.target.value)}
            placeholder="Nombre y vínculo"
          />
        </Field>
        <Field label="Teléfono de emergencia">
          <Input
            value={form.contacto_emergencia_telefono}
            onChange={(event) => update('contacto_emergencia_telefono', event.target.value)}
            placeholder="11-5555-9876"
          />
        </Field>
        <Field label="Banco">
          <Input
            value={form.banco}
            onChange={(event) => update('banco', event.target.value)}
            placeholder="Galicia"
          />
        </Field>
        <Field label="CBU" error={errors.cbu} hint="22 dígitos">
          <Input
            value={form.cbu}
            onChange={(event) => update('cbu', event.target.value)}
            placeholder="0070123456789012345678"
            inputMode="numeric"
          />
        </Field>

        <SectionTitle title="Observaciones" />
        <Field label="Notas internas" className="col-span-full">
          <Textarea
            value={form.notas}
            onChange={(event) => update('notas', event.target.value)}
            placeholder="Información adicional del legajo (no se muestra en reportes)."
            rows={2}
          />
        </Field>
      </form>
    </Modal>
  )
}
