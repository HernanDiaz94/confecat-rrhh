import type {
  AuditEntry,
  ContractType,
  Employee,
  EmployeeInput,
  EmployeeStatus,
  ImportRowInput,
  ImportSummary,
  ListEmployeesParams,
  ListEmployeesResult,
  Position,
  Sector,
} from '@/lib/types'
import { normalizeKey, onlyDigits, todayIso } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { ApplyImportOptions, Repo } from './repo'

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

function fail(error: { message: string; code?: string } | null): never {
  if (error?.code === '23505') {
    throw new Error('Ya existe un registro con ese DNI o legajo. Revisá los datos e intentá de nuevo.')
  }
  throw new Error(error?.message ?? 'Ocurrió un error inesperado.')
}

function sanitize(input: EmployeeInput): EmployeeInput {
  return {
    ...input,
    legajo: input.legajo.trim(),
    dni: onlyDigits(input.dni),
    cuil: onlyDigits(input.cuil),
    apellido: input.apellido.trim(),
    nombre: input.nombre.trim(),
    email: input.email?.trim() || null,
    telefono: input.telefono?.trim() || null,
    cbu: input.cbu ? onlyDigits(input.cbu) : null,
  }
}

function importedFields(row: ImportRowInput, catalogs: {
  sectorId: string | null
  positionId: string | null
  contractId: string | null
}) {
  return {
    legajo: row.legajo,
    dni: row.dni,
    cuil: row.cuil,
    apellido: row.apellido,
    nombre: row.nombre,
    fecha_nacimiento: row.fecha_nacimiento,
    fecha_ingreso: row.fecha_ingreso,
    sector_id: catalogs.sectorId,
    position_id: catalogs.positionId,
    categoria: row.categoria,
    contract_type_id: catalogs.contractId,
    jornada_horas: row.jornada_horas,
    sueldo_basico: row.sueldo_basico,
    telefono: row.telefono,
    email: row.email,
    banco: row.banco,
    cbu: row.cbu,
  }
}

export const supabaseRepo: Repo = {
  mode: 'supabase',

  async listEmployees(params: ListEmployeesParams): Promise<ListEmployeesResult> {
    const from = ((params.page ?? 1) - 1) * (params.pageSize ?? 10)
    const to = from + (params.pageSize ?? 10) - 1
    let query = client()
      .from('employees')
      .select('*', { count: 'exact' })
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true })
      .range(from, to)

    if (params.estado && params.estado !== 'todos') query = query.eq('estado', params.estado)
    if (params.sectorId) query = query.eq('sector_id', params.sectorId)

    const search = (params.search ?? '').trim().replace(/[%,()]/g, ' ')
    if (search) {
      query = query.or(
        `apellido.ilike.%${search}%,nombre.ilike.%${search}%,dni.ilike.%${search}%,legajo.ilike.%${search}%,cuil.ilike.%${search}%`,
      )
    }

    const { data, error, count } = await query
    if (error) fail(error)
    return { rows: (data ?? []) as Employee[], total: count ?? 0 }
  },

  async listAllEmployees(): Promise<Employee[]> {
    const { data, error } = await client()
      .from('employees')
      .select('*')
      .order('apellido', { ascending: true })
    if (error) fail(error)
    return (data ?? []) as Employee[]
  },

  async getEmployee(id: string): Promise<Employee | null> {
    const { data, error } = await client().from('employees').select('*').eq('id', id).maybeSingle()
    if (error) fail(error)
    return (data as Employee | null) ?? null
  },

  async createEmployee(input: EmployeeInput): Promise<Employee> {
    const clean = sanitize(input)
    const { data, error } = await client().from('employees').insert(clean).select('*').single()
    if (error) fail(error)
    return data as Employee
  },

  async updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
    const clean = sanitize(input)
    const { data, error } = await client()
      .from('employees')
      .update(clean)
      .eq('id', id)
      .select('*')
      .single()
    if (error) fail(error)
    return data as Employee
  },

  async setEmployeeStatus(
    id: string,
    patch: { estado: EmployeeStatus; fecha_egreso?: string | null; motivo_baja?: string | null },
  ): Promise<void> {
    const { error } = await client()
      .from('employees')
      .update({
        estado: patch.estado,
        fecha_egreso: patch.estado === 'baja' ? patch.fecha_egreso || todayIso() : null,
        motivo_baja: patch.estado === 'baja' ? patch.motivo_baja || null : null,
      })
      .eq('id', id)
    if (error) fail(error)
  },

  async listSectors(): Promise<Sector[]> {
    const { data, error } = await client().from('sectors').select('*').order('nombre')
    if (error) fail(error)
    return (data ?? []) as Sector[]
  },

  async saveSector(input: { id?: string; nombre: string; activo?: boolean }): Promise<Sector> {
    const payload = { nombre: input.nombre.trim(), activo: input.activo ?? true }
    if (input.id) {
      const { data, error } = await client()
        .from('sectors')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) fail(error)
      return data as Sector
    }
    const { data, error } = await client().from('sectors').insert(payload).select('*').single()
    if (error) fail(error)
    return data as Sector
  },

  async listPositions(): Promise<Position[]> {
    const { data, error } = await client().from('positions').select('*').order('nombre')
    if (error) fail(error)
    return (data ?? []) as Position[]
  },

  async savePosition(input: {
    id?: string
    nombre: string
    sector_id: string
    activo?: boolean
  }): Promise<Position> {
    const payload = {
      nombre: input.nombre.trim(),
      sector_id: input.sector_id,
      activo: input.activo ?? true,
    }
    if (input.id) {
      const { data, error } = await client()
        .from('positions')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) fail(error)
      return data as Position
    }
    const { data, error } = await client().from('positions').insert(payload).select('*').single()
    if (error) fail(error)
    return data as Position
  },

  async listContractTypes(): Promise<ContractType[]> {
    const { data, error } = await client().from('contract_types').select('*').order('nombre')
    if (error) fail(error)
    return (data ?? []) as ContractType[]
  },

  async saveContractType(input: { id?: string; nombre: string; activo?: boolean }): Promise<ContractType> {
    const payload = { nombre: input.nombre.trim(), activo: input.activo ?? true }
    if (input.id) {
      const { data, error } = await client()
        .from('contract_types')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) fail(error)
      return data as ContractType
    }
    const { data, error } = await client().from('contract_types').insert(payload).select('*').single()
    if (error) fail(error)
    return data as ContractType
  },

  async listAudit(employeeId?: string): Promise<AuditEntry[]> {
    let query = client()
      .from('audit_log')
      .select('*, profiles(nombre)')
      .order('created_at', { ascending: false })
      .limit(60)
    if (employeeId) query = query.eq('entity_id', employeeId)
    const { data, error } = await query
    if (error) fail(error)
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      entity: row.entity as string,
      entity_id: row.entity_id as string,
      action: row.action as AuditEntry['action'],
      changes: (row.changes ?? {}) as AuditEntry['changes'],
      user_name:
        ((row.profiles as { nombre?: string } | null)?.nombre ?? 'Sistema') as string,
      created_at: row.created_at as string,
    }))
  },

  async applyImport(rows: ImportRowInput[], options: ApplyImportOptions): Promise<ImportSummary> {
    const db = client()
    const summary: ImportSummary = { creados: 0, actualizados: 0, omitidos: 0, errores: [] }

    const [{ data: employeeRows, error: employeesError }, { data: sectorRows }, { data: positionRows }, { data: contractRows }] =
      await Promise.all([
        db.from('employees').select('*'),
        db.from('sectors').select('*'),
        db.from('positions').select('*'),
        db.from('contract_types').select('*'),
      ])
    if (employeesError) fail(employeesError)

    const employees = (employeeRows ?? []) as Employee[]
    const sectors = [...((sectorRows ?? []) as Sector[])]
    const positions = [...((positionRows ?? []) as Position[])]
    const contracts = (contractRows ?? []) as ContractType[]

    const inserts: EmployeeInput[] = []
    const insertRows: ImportRowInput[] = []
    const updates: { id: string; payload: Record<string, unknown> }[] = []

    for (const row of rows) {
      try {
        let sector = sectors.find(
          (item) => normalizeKey(item.nombre) === normalizeKey(row.sector ?? ''),
        )
        if (!sector && row.sector && options.createMissing) {
          sector = await supabaseRepo.saveSector({ nombre: row.sector })
          sectors.push(sector)
        }
        let position = positions.find(
          (item) =>
            normalizeKey(item.nombre) === normalizeKey(row.puesto ?? '') &&
            (!sector || item.sector_id === sector.id),
        )
        if (!position && row.puesto && options.createMissing && sector) {
          position = await supabaseRepo.savePosition({ nombre: row.puesto, sector_id: sector.id })
          positions.push(position)
        }
        const contract = contracts.find(
          (item) => normalizeKey(item.nombre) === normalizeKey(row.tipo_contrato ?? ''),
        )

        const existing = employees.find(
          (employee) =>
            onlyDigits(employee.dni) === onlyDigits(row.dni) ||
            normalizeKey(employee.legajo) === normalizeKey(row.legajo),
        )

        const fields = importedFields(row, {
          sectorId: sector?.id ?? null,
          positionId: position?.id ?? null,
          contractId: contract?.id ?? null,
        })

        if (existing) {
          if (!options.updateExisting) {
            summary.omitidos++
            continue
          }
          updates.push({
            id: existing.id,
            payload: Object.fromEntries(
              Object.entries(fields).filter(
                ([, value]) => value !== null && value !== undefined && value !== '',
              ),
            ),
          })
          summary.actualizados++
        } else {
          inserts.push({
            estado_civil: null,
            domicilio: null,
            contacto_emergencia_nombre: null,
            contacto_emergencia_telefono: null,
            fecha_egreso: null,
            estado: 'activo',
            motivo_baja: null,
            notas: null,
            ...fields,
          })
          insertRows.push(row)
        }
      } catch (error) {
        summary.errores.push({
          fila: row.rowNumber,
          detalle: error instanceof Error ? error.message : 'Error desconocido',
        })
      }
    }

    for (let i = 0; i < updates.length; i++) {
      const { error } = await db.from('employees').update(updates[i].payload).eq('id', updates[i].id)
      if (error) {
        // No sabemos exactamente qué fila falló; reintentamos una a una no es necesario:
        // cualquier error de update con datos ya validados es excepcional.
        summary.errores.push({ fila: 0, detalle: `Error al actualizar: ${error.message}` })
      }
    }

    const chunkSize = 100
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize)
      const { error } = await db.from('employees').insert(chunk)
      if (error) {
        // Fallback fila por fila para aislar el registro con problema.
        for (let j = 0; j < chunk.length; j++) {
          const single = await db.from('employees').insert(chunk[j])
          if (single.error) {
            summary.errores.push({
              fila: insertRows[i + j]?.rowNumber ?? 0,
              detalle: single.error.message,
            })
          } else {
            summary.creados++
          }
        }
      } else {
        summary.creados += chunk.length
      }
    }

    return summary
  },
}
