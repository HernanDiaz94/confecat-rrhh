import type {
  AuditChange,
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
import type { ApplyImportOptions, Repo } from './repo'
import { buildSeed, SEED_VERSION } from './seed'

const NS = 'confecat.rrhh.v1'
const K = {
  sectors: `${NS}.sectors`,
  positions: `${NS}.positions`,
  contracts: `${NS}.contracts`,
  employees: `${NS}.employees`,
  audit: `${NS}.audit`,
  seeded: `${NS}.seeded`,
}

let actorName = 'Sistema'
export function setDemoActor(name: string) {
  actorName = name || 'Sistema'
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function ensureSeed() {
  if (localStorage.getItem(K.seeded) === SEED_VERSION) return
  const seed = buildSeed()
  const now = new Date().toISOString()
  const employees: Employee[] = seed.employees.map((input, index) => ({
    ...input,
    id: `emp-${String(index + 1).padStart(3, '0')}`,
    created_at: now,
    updated_at: now,
  }))
  write(K.sectors, seed.sectors)
  write(K.positions, seed.positions)
  write(K.contracts, seed.contractTypes)
  write(K.employees, employees)
  write<AuditEntry[]>(K.audit, [
    {
      id: crypto.randomUUID(),
      entity: 'employees',
      entity_id: employees[0]?.id ?? 'sistema',
      action: 'crear',
      changes: {},
      user_name: 'Sistema',
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      entity: 'employees',
      entity_id: employees[1]?.id ?? 'sistema',
      action: 'actualizar',
      changes: { sueldo_basico: { antes: 1050000, despues: 1120000 } },
      user_name: 'Sistema',
      created_at: now,
    },
  ])
  localStorage.setItem(K.seeded, SEED_VERSION)
}

export function resetDemoData() {
  Object.values(K).forEach((key) => localStorage.removeItem(key))
  ensureSeed()
}

function findSectorByName(sectors: Sector[], name: string | null): Sector | undefined {
  if (!name) return undefined
  const key = normalizeKey(name)
  return sectors.find((sector) => normalizeKey(sector.nombre) === key)
}

function findPositionByName(
  positions: Position[],
  name: string | null,
  sectorId: string | null | undefined,
): Position | undefined {
  if (!name) return undefined
  const key = normalizeKey(name)
  return positions.find(
    (position) =>
      normalizeKey(position.nombre) === key &&
      (!sectorId || position.sector_id === sectorId),
  )
}

function audit(
  list: AuditEntry[],
  entityId: string,
  action: AuditEntry['action'],
  changes: Record<string, AuditChange>,
  summaryName?: string,
) {
  list.unshift({
    id: crypto.randomUUID(),
    entity: 'employees',
    entity_id: entityId,
    action,
    changes,
    user_name: summaryName ? `${actorName}` : actorName,
    created_at: new Date().toISOString(),
  })
}

function diffEmployees(before: Employee, after: Employee): Record<string, AuditChange> {
  const changes: Record<string, AuditChange> = {}
  const keys = Object.keys(after) as (keyof Employee)[]
  for (const key of keys) {
    if (key === 'updated_at' || key === 'created_at') continue
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { antes: before[key], despues: after[key] }
    }
  }
  return changes
}

function assertUnique(employees: Employee[], input: EmployeeInput, excludeId?: string) {
  const dni = onlyDigits(input.dni)
  const legajo = input.legajo.trim()
  const duplicateDni = employees.find((e) => e.id !== excludeId && onlyDigits(e.dni) === dni)
  if (duplicateDni) {
    throw new Error(
      `El DNI ${dni} ya está registrado en el legajo ${duplicateDni.legajo} (${duplicateDni.apellido}, ${duplicateDni.nombre}).`,
    )
  }
  const duplicateLegajo = employees.find(
    (e) => e.id !== excludeId && normalizeKey(e.legajo) === normalizeKey(legajo),
  )
  if (duplicateLegajo) {
    throw new Error(`El legajo ${legajo} ya está asignado a ${duplicateLegajo.apellido}, ${duplicateLegajo.nombre}.`)
  }
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

export const demoRepo: Repo = {
  mode: 'demo',

  async listEmployees(params: ListEmployeesParams): Promise<ListEmployeesResult> {
    ensureSeed()
    const employees = read<Employee[]>(K.employees, [])
    const search = normalizeKey(params.search ?? '')
    const estado = params.estado ?? 'todos'
    let rows = employees.filter((employee) => {
      if (estado !== 'todos' && employee.estado !== estado) return false
      if (params.sectorId && employee.sector_id !== params.sectorId) return false
      if (!search) return true
      const haystack = normalizeKey(
        `${employee.apellido} ${employee.nombre} ${employee.dni} ${employee.legajo} ${employee.cuil}`,
      )
      return haystack.includes(search)
    })
    rows = rows.sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'))
    const total = rows.length
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 10
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total }
  },

  async listAllEmployees(): Promise<Employee[]> {
    ensureSeed()
    return read<Employee[]>(K.employees, []).sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'))
  },

  async getEmployee(id: string): Promise<Employee | null> {
    ensureSeed()
    return read<Employee[]>(K.employees, []).find((employee) => employee.id === id) ?? null
  },

  async createEmployee(input: EmployeeInput): Promise<Employee> {
    ensureSeed()
    const employees = read<Employee[]>(K.employees, [])
    const clean = sanitize(input)
    assertUnique(employees, clean)
    const now = new Date().toISOString()
    const employee: Employee = {
      ...clean,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    employees.push(employee)
    write(K.employees, employees)
    const log = read<AuditEntry[]>(K.audit, [])
    audit(log, employee.id, 'crear', {})
    write(K.audit, log)
    return employee
  },

  async updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
    ensureSeed()
    const employees = read<Employee[]>(K.employees, [])
    const index = employees.findIndex((employee) => employee.id === id)
    if (index < 0) throw new Error('El empleado no existe o fue eliminado.')
    const clean = sanitize(input)
    assertUnique(employees, clean, id)
    const before = employees[index]
    const after: Employee = { ...clean, id, created_at: before.created_at, updated_at: new Date().toISOString() }
    employees[index] = after
    write(K.employees, employees)
    const log = read<AuditEntry[]>(K.audit, [])
    const changes = diffEmployees(before, after)
    if (Object.keys(changes).length > 0) {
      audit(log, id, 'actualizar', changes)
      write(K.audit, log)
    }
    return after
  },

  async setEmployeeStatus(
    id: string,
    patch: { estado: EmployeeStatus; fecha_egreso?: string | null; motivo_baja?: string | null },
  ): Promise<void> {
    ensureSeed()
    const employees = read<Employee[]>(K.employees, [])
    const index = employees.findIndex((employee) => employee.id === id)
    if (index < 0) throw new Error('El empleado no existe.')
    const before = employees[index]
    const after: Employee = {
      ...before,
      estado: patch.estado,
      fecha_egreso:
        patch.estado === 'baja' ? patch.fecha_egreso || todayIso() : null,
      motivo_baja: patch.estado === 'baja' ? patch.motivo_baja || null : null,
      updated_at: new Date().toISOString(),
    }
    employees[index] = after
    write(K.employees, employees)
    const log = read<AuditEntry[]>(K.audit, [])
    audit(
      log,
      id,
      patch.estado === 'baja' ? 'baja' : 'reactivar',
      patch.estado === 'baja'
        ? { estado: { antes: before.estado, despues: 'baja' }, motivo_baja: { despues: after.motivo_baja } }
        : { estado: { antes: before.estado, despues: patch.estado } },
    )
    write(K.audit, log)
  },

  async listSectors(): Promise<Sector[]> {
    ensureSeed()
    return read<Sector[]>(K.sectors, []).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  },

  async saveSector(input: { id?: string; nombre: string; activo?: boolean }): Promise<Sector> {
    ensureSeed()
    const sectors = read<Sector[]>(K.sectors, [])
    const nombre = input.nombre.trim()
    if (!nombre) throw new Error('El nombre del sector es obligatorio.')
    const duplicate = sectors.find(
      (sector) => sector.id !== input.id && normalizeKey(sector.nombre) === normalizeKey(nombre),
    )
    if (duplicate) throw new Error('Ya existe un sector con ese nombre.')
    if (input.id) {
      const index = sectors.findIndex((sector) => sector.id === input.id)
      if (index < 0) throw new Error('El sector no existe.')
      sectors[index] = { ...sectors[index], nombre, activo: input.activo ?? sectors[index].activo }
      write(K.sectors, sectors)
      return sectors[index]
    }
    const sector: Sector = {
      id: crypto.randomUUID(),
      nombre,
      activo: input.activo ?? true,
      created_at: new Date().toISOString(),
    }
    sectors.push(sector)
    write(K.sectors, sectors)
    return sector
  },

  async listPositions(): Promise<Position[]> {
    ensureSeed()
    return read<Position[]>(K.positions, []).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  },

  async savePosition(input: {
    id?: string
    nombre: string
    sector_id: string
    activo?: boolean
  }): Promise<Position> {
    ensureSeed()
    const positions = read<Position[]>(K.positions, [])
    const nombre = input.nombre.trim()
    if (!nombre) throw new Error('El nombre del puesto es obligatorio.')
    if (!input.sector_id) throw new Error('Tenés que elegir un sector.')
    const duplicate = positions.find(
      (position) =>
        position.id !== input.id &&
        position.sector_id === input.sector_id &&
        normalizeKey(position.nombre) === normalizeKey(nombre),
    )
    if (duplicate) throw new Error('Ya existe un puesto con ese nombre en el sector.')
    if (input.id) {
      const index = positions.findIndex((position) => position.id === input.id)
      if (index < 0) throw new Error('El puesto no existe.')
      positions[index] = {
        ...positions[index],
        nombre,
        sector_id: input.sector_id,
        activo: input.activo ?? positions[index].activo,
      }
      write(K.positions, positions)
      return positions[index]
    }
    const position: Position = {
      id: crypto.randomUUID(),
      nombre,
      sector_id: input.sector_id,
      activo: input.activo ?? true,
      created_at: new Date().toISOString(),
    }
    positions.push(position)
    write(K.positions, positions)
    return position
  },

  async listContractTypes(): Promise<ContractType[]> {
    ensureSeed()
    return read<ContractType[]>(K.contracts, []).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  },

  async saveContractType(input: { id?: string; nombre: string; activo?: boolean }): Promise<ContractType> {
    ensureSeed()
    const contracts = read<ContractType[]>(K.contracts, [])
    const nombre = input.nombre.trim()
    if (!nombre) throw new Error('El nombre del tipo de contrato es obligatorio.')
    const duplicate = contracts.find(
      (contract) => contract.id !== input.id && normalizeKey(contract.nombre) === normalizeKey(nombre),
    )
    if (duplicate) throw new Error('Ya existe un tipo de contrato con ese nombre.')
    if (input.id) {
      const index = contracts.findIndex((contract) => contract.id === input.id)
      if (index < 0) throw new Error('El tipo de contrato no existe.')
      contracts[index] = { ...contracts[index], nombre, activo: input.activo ?? contracts[index].activo }
      write(K.contracts, contracts)
      return contracts[index]
    }
    const contract: ContractType = {
      id: crypto.randomUUID(),
      nombre,
      activo: input.activo ?? true,
      created_at: new Date().toISOString(),
    }
    contracts.push(contract)
    write(K.contracts, contracts)
    return contract
  },

  async listAudit(employeeId?: string): Promise<AuditEntry[]> {
    ensureSeed()
    const log = read<AuditEntry[]>(K.audit, [])
    return log
      .filter((entry) => !employeeId || entry.entity_id === employeeId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 60)
  },

  async applyImport(rows: ImportRowInput[], options: ApplyImportOptions): Promise<ImportSummary> {
    ensureSeed()
    const employees = read<Employee[]>(K.employees, [])
    const sectors = read<Sector[]>(K.sectors, [])
    const positions = read<Position[]>(K.positions, [])
    const contracts = read<ContractType[]>(K.contracts, [])
    const log = read<AuditEntry[]>(K.audit, [])
    const summary: ImportSummary = { creados: 0, actualizados: 0, omitidos: 0, errores: [] }
    const now = new Date().toISOString()

    for (const row of rows) {
      try {
        let sector = findSectorByName(sectors, row.sector)
        if (!sector && row.sector && options.createMissing) {
          sector = {
            id: crypto.randomUUID(),
            nombre: row.sector.trim(),
            activo: true,
            created_at: now,
          }
          sectors.push(sector)
        }
        let position = findPositionByName(positions, row.puesto, sector?.id)
        if (!position && row.puesto && options.createMissing && sector) {
          position = {
            id: crypto.randomUUID(),
            nombre: row.puesto.trim(),
            sector_id: sector.id,
            activo: true,
            created_at: now,
          }
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

        const imported: Partial<EmployeeInput> = {
          legajo: row.legajo,
          dni: row.dni,
          cuil: row.cuil,
          apellido: row.apellido,
          nombre: row.nombre,
          fecha_nacimiento: row.fecha_nacimiento,
          fecha_ingreso: row.fecha_ingreso,
          sector_id: sector?.id ?? null,
          position_id: position?.id ?? null,
          categoria: row.categoria,
          contract_type_id: contract?.id ?? null,
          jornada_horas: row.jornada_horas,
          sueldo_basico: row.sueldo_basico,
          telefono: row.telefono,
          email: row.email,
          banco: row.banco,
          cbu: row.cbu,
        }

        if (existing) {
          if (!options.updateExisting) {
            summary.omitidos++
            continue
          }
          const before = { ...existing }
          const after: Employee = {
            ...existing,
            ...Object.fromEntries(
              Object.entries(imported).filter(([, value]) => value !== null && value !== undefined && value !== ''),
            ),
            updated_at: now,
          }
          Object.assign(existing, after)
          const changes = diffEmployees(before, after)
          if (Object.keys(changes).length > 0) {
            audit(log, existing.id, 'actualizar', changes)
          }
          summary.actualizados++
        } else {
          assertUnique(employees, {
            ...(imported as EmployeeInput),
            estado_civil: null,
            domicilio: null,
            contacto_emergencia_nombre: null,
            contacto_emergencia_telefono: null,
            fecha_egreso: null,
            estado: 'activo',
            motivo_baja: null,
            notas: null,
          })
          const employee: Employee = {
            ...(imported as EmployeeInput),
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
          }
          employees.push(employee)
          audit(log, employee.id, 'crear', {})
          summary.creados++
        }
      } catch (error) {
        summary.errores.push({
          fila: row.rowNumber,
          detalle: error instanceof Error ? error.message : 'Error desconocido',
        })
      }
    }

    write(K.employees, employees)
    write(K.sectors, sectors)
    write(K.positions, positions)
    write(K.audit, log)
    return summary
  },
}
