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

export interface ApplyImportOptions {
  updateExisting: boolean
  createMissing: boolean
}

export interface Repo {
  mode: 'demo' | 'supabase'

  listEmployees(params: ListEmployeesParams): Promise<ListEmployeesResult>
  listAllEmployees(): Promise<Employee[]>
  getEmployee(id: string): Promise<Employee | null>
  createEmployee(input: EmployeeInput): Promise<Employee>
  updateEmployee(id: string, input: EmployeeInput): Promise<Employee>
  setEmployeeStatus(
    id: string,
    patch: { estado: EmployeeStatus; fecha_egreso?: string | null; motivo_baja?: string | null },
  ): Promise<void>

  listSectors(): Promise<Sector[]>
  saveSector(input: { id?: string; nombre: string; activo?: boolean }): Promise<Sector>
  listPositions(): Promise<Position[]>
  savePosition(input: {
    id?: string
    nombre: string
    sector_id: string
    activo?: boolean
  }): Promise<Position>
  listContractTypes(): Promise<ContractType[]>
  saveContractType(input: { id?: string; nombre: string; activo?: boolean }): Promise<ContractType>

  listAudit(employeeId?: string): Promise<AuditEntry[]>
  applyImport(rows: ImportRowInput[], options: ApplyImportOptions): Promise<ImportSummary>
}
