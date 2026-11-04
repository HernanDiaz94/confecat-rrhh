export type Role = 'admin' | 'rrhh' | 'consulta'

export type EmployeeStatus = 'activo' | 'licencia' | 'baja'

export interface Sector {
  id: string
  nombre: string
  activo: boolean
  created_at?: string
}

export interface Position {
  id: string
  nombre: string
  sector_id: string
  activo: boolean
  created_at?: string
}

export interface ContractType {
  id: string
  nombre: string
  activo: boolean
  created_at?: string
}

export interface Employee {
  id: string
  legajo: string
  dni: string
  cuil: string
  apellido: string
  nombre: string
  fecha_nacimiento: string | null
  estado_civil: string | null
  domicilio: string | null
  telefono: string | null
  email: string | null
  contacto_emergencia_nombre: string | null
  contacto_emergencia_telefono: string | null
  fecha_ingreso: string
  fecha_egreso: string | null
  sector_id: string | null
  position_id: string | null
  categoria: string | null
  contract_type_id: string | null
  jornada_horas: number | null
  sueldo_basico: number | null
  banco: string | null
  cbu: string | null
  estado: EmployeeStatus
  motivo_baja: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type EmployeeInput = Omit<Employee, 'id' | 'created_at' | 'updated_at'>

export interface AuditChange {
  antes?: unknown
  despues?: unknown
}

export interface AuditEntry {
  id: string
  entity: string
  entity_id: string
  action: 'crear' | 'actualizar' | 'baja' | 'reactivar' | 'eliminar'
  changes: Record<string, AuditChange>
  user_name: string
  created_at: string
}

export interface SessionUser {
  id: string
  email: string
  nombre: string
  rol: Role
}

export interface ListEmployeesParams {
  search?: string
  sectorId?: string
  estado?: EmployeeStatus | 'todos'
  page?: number
  pageSize?: number
}

export interface ListEmployeesResult {
  rows: Employee[]
  total: number
}

export interface ImportRowInput {
  rowNumber: number
  legajo: string
  dni: string
  cuil: string
  apellido: string
  nombre: string
  fecha_nacimiento: string | null
  fecha_ingreso: string
  sector: string | null
  puesto: string | null
  categoria: string | null
  tipo_contrato: string | null
  jornada_horas: number | null
  sueldo_basico: number | null
  telefono: string | null
  email: string | null
  banco: string | null
  cbu: string | null
}

export type ImportAction = 'crear' | 'actualizar' | 'omitir' | 'error'

export interface ImportRowResult {
  rowNumber: number
  action: ImportAction
  errors: string[]
  warnings: string[]
  input: ImportRowInput
}

export interface ImportSummary {
  creados: number
  actualizados: number
  omitidos: number
  errores: { fila: number; detalle: string }[]
}
